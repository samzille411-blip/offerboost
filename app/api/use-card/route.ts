import { NextResponse } from "next/server";
import { formatPremiumReportDisplay } from "@/lib/format-premium-report";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { fetchPremiumReportFromLlm } from "@/lib/fetch-premium-llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { userMessages } from "@/lib/user-messages";
import { enforceUseCardRateLimit } from "@/lib/use-card-rate-limit";
import { enforcePremiumLlmGlobalRateLimit } from "@/lib/upstash-rate-limit";
import { hashResumeJd } from "@/lib/content-hash";
import { validateInputLength } from "@/lib/input-limits";
import { getClientIp } from "@/lib/rate-limit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

async function rollbackRedemption(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  code: string
) {
  const { error } = await supabase.rpc("rollback_card_redemption", { p_code: code });
  if (error) console.error("rollback_card_redemption failed", code, error);
}

export async function POST(req: Request) {
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  let redeemedCode: string | null = null;

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
    }
    if (!process.env.LLM_API_KEY) {
      return NextResponse.json({ error: "AI 服务未配置" }, { status: 503 });
    }

    const { card_code, resume, jd, request_id } = await req.json();
    if (!card_code?.trim() || !resume?.trim() || !jd?.trim()) {
      return NextResponse.json({ error: userMessages.emptyUnlock }, { status: 400 });
    }

    const lengthCheck = validateInputLength(String(resume), String(jd));
    if (!lengthCheck.ok) {
      return NextResponse.json({ error: lengthCheck.message, code: "input_too_long" }, { status: 400 });
    }

    supabase = getSupabaseAdmin();
    const code = String(card_code).trim();
    const ip = getClientIp(req);

    const { data: card, error: fetchError } = await supabase
      .from("cards")
      .select("code, total_times, used_times, level")
      .eq("code", code)
      .maybeSingle();

    if (fetchError) {
      console.error("cards fetch error", fetchError);
      return NextResponse.json(
        { error: "卡密查询失败，请稍后重试", code: "db_fetch_error" },
        { status: 503 }
      );
    }

    const exists = !!card;
    const hasRemaining = exists && card.used_times < card.total_times;

    const rateLimited = await enforceUseCardRateLimit(req, code, { exists, hasRemaining });
    if (rateLimited) return rateLimited;

    if (request_id) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: dup, error: dupError } = await supabase
        .from("usage_log")
        .select("report_text, level")
        .eq("request_id", request_id)
        .gte("created_at", since)
        .maybeSingle();
      if (dupError) {
        console.error("usage_log idempotency check failed", dupError);
      } else if (dup) {
        return NextResponse.json({
          status: "success",
          remaining: card ? Math.max(0, card.total_times - card.used_times) : 0,
          level: dup.level,
          aiContent: formatPremiumReportDisplay(dup.report_text),
          idempotent: true,
        });
      }
    }

    if (!exists) {
      return NextResponse.json(
        { error: "卡密不存在，请前往合作平台获取", code: "card_not_found" },
        { status: 404 }
      );
    }

    if (!hasRemaining) {
      return NextResponse.json(
        { error: "该卡密可用次数已耗尽", code: "card_exhausted" },
        { status: 403 }
      );
    }

    const globalLimited = await enforcePremiumLlmGlobalRateLimit();
    if (!globalLimited.ok) return globalLimited.response;

    const { data: redeem, error: redeemError } = await supabase.rpc("redeem_card", { p_code: code });
    if (redeemError) {
      console.error("redeem_card rpc error", redeemError);
      return NextResponse.json(
        { error: "核销失败，请稍后重试", code: "redeem_error" },
        { status: 503 }
      );
    }

    if (!redeem || typeof redeem !== "object") {
      return NextResponse.json(
        { error: "核销失败，请稍后重试", code: "redeem_error" },
        { status: 503 }
      );
    }

    if (!redeem.ok) {
      const err = String(redeem.error || "");
      if (err === "exhausted") {
        return NextResponse.json(
          { error: "该卡密可用次数已耗尽", code: "card_exhausted" },
          { status: 403 }
        );
      }
      if (err === "not_found") {
        return NextResponse.json({ error: "卡密不存在", code: "card_not_found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "核销失败，请稍后重试", code: "redeem_error" },
        { status: 503 }
      );
    }

    redeemedCode = code;
    const level = Number(redeem.level);
    if (!Number.isFinite(level) || level < 1 || level > 3) {
      await rollbackRedemption(supabase, code);
      redeemedCode = null;
      return NextResponse.json(
        { error: "卡密数据异常，请稍后重试", code: "redeem_error" },
        { status: 503 }
      );
    }

    let aiContent = "";
    try {
      aiContent = await fetchPremiumReportFromLlm(resume, jd, level);
    } catch (llmErr) {
      await rollbackRedemption(supabase, code);
      redeemedCode = null;
      console.error("llm error, rolled back", llmErr);
      if (llmErr instanceof Error && llmErr.message === "blocked_content") {
        return NextResponse.json(
          { error: `${userMessages.blockedContent}（次数已回滚，请修改内容后重试）` },
          { status: 400 }
        );
      }
      if (llmErr instanceof Error && llmErr.message === "incomplete_report") {
        return NextResponse.json(
          {
            error: "报告生成不完整，请稍后重试（次数已回滚，未扣费）",
            code: "incomplete_report",
          },
          { status: 502 }
        );
      }
      const mapped = mapLlmErrorToResponse(llmErr);
      return NextResponse.json(
        { error: `${mapped.error}（次数已回滚）`, code: mapped.code },
        { status: mapped.status }
      );
    }

    const contentHash = await hashResumeJd(resume, jd);
    const { error: logError } = await supabase.from("usage_log").insert({
      card_code: code,
      content_hash: contentHash,
      report_text: aiContent,
      level,
      request_id: request_id || null,
      ip,
    });

    if (logError) {
      console.error("usage_log insert failed", logError);
      await rollbackRedemption(supabase, code);
      redeemedCode = null;
      return NextResponse.json(
        { error: "报告保存失败，次数已回滚，请重试", code: "log_failed" },
        { status: 503 }
      );
    }

    const remaining =
      typeof redeem.remaining === "number"
        ? redeem.remaining
        : Math.max(0, card.total_times - card.used_times - 1);

    return NextResponse.json({
      status: "success",
      remaining,
      level,
      aiContent,
    });
  } catch (e) {
    console.error("use-card error", e);
    if (supabase && redeemedCode) {
      await rollbackRedemption(supabase, redeemedCode);
    }
    const mapped = mapLlmErrorToResponse(e);
    return NextResponse.json(
      { error: mapped.error, code: mapped.code || "internal_error" },
      { status: mapped.status }
    );
  }
}
