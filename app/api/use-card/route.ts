import { NextResponse } from "next/server";
import { formatPremiumReportDisplay } from "@/lib/format-premium-report";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getLLMClient, getPremiumModel, buildLevelPrompt, getPremiumMaxTokens } from "@/lib/llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { isBlockedLlmOutput, userMessages } from "@/lib/user-messages";
import { checkRateLimit, getClientIp, sha256 } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const max = Number(process.env.RATE_LIMIT_MAX_USE_CARD || 5);
    if (!checkRateLimit(`use-card:${ip}`, max)) {
      return NextResponse.json({ error: userMessages.rateLimited }, { status: 429 });
    }

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

    const supabase = getSupabaseAdmin();
    const code = String(card_code).trim();

    // 短时幂等：同一 request_id 5 分钟内不重复扣次
    if (request_id) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: dup } = await supabase
        .from("usage_log")
        .select("report_text, level")
        .eq("request_id", request_id)
        .gte("created_at", since)
        .maybeSingle();
      if (dup) {
        const { data: card } = await supabase.from("cards").select("total_times, used_times, level").eq("code", code).single();
        return NextResponse.json({
          status: "success",
          remaining: card ? card.total_times - card.used_times : 0,
          level: dup.level,
          aiContent: formatPremiumReportDisplay(dup.report_text),
          idempotent: true,
        });
      }
    }

    const { data: card, error: fetchError } = await supabase
      .from("cards")
      .select("*")
      .eq("code", code)
      .single();

    if (fetchError || !card) {
      return NextResponse.json({ error: "卡密不存在，请前往合作平台获取" }, { status: 404 });
    }
    if (card.used_times >= card.total_times) {
      return NextResponse.json({ error: "该卡密可用次数已耗尽" }, { status: 403 });
    }

    const { data: redeem, error: redeemError } = await supabase.rpc("redeem_card", { p_code: code });
    if (redeemError || !redeem?.ok) {
      const err = redeem?.error || redeemError?.message;
      if (err === "exhausted") return NextResponse.json({ error: "该卡密可用次数已耗尽" }, { status: 403 });
      if (err === "not_found") return NextResponse.json({ error: "卡密不存在" }, { status: 404 });
      return NextResponse.json({ error: "核销失败，请重试" }, { status: 500 });
    }

    const level = redeem.level as number;
    let aiContent = "";

    try {
      const client = getLLMClient();
      const completion = await client.chat.completions.create({
        model: getPremiumModel(),
        temperature: 0,
        max_tokens: getPremiumMaxTokens(level),
        messages: [
          { role: "system", content: buildLevelPrompt(level) },
          { role: "user", content: `【用户简历】\n${resume}\n\n【目标岗位JD】\n${jd}` },
        ],
      });
      aiContent = completion.choices[0]?.message?.content || "";
      if (!aiContent) throw new Error("empty response");
      if (isBlockedLlmOutput(aiContent)) {
        throw new Error("blocked_content");
      }
      aiContent = formatPremiumReportDisplay(aiContent);
    } catch (llmErr) {
      await supabase
        .from("cards")
        .update({ used_times: Math.max(0, card.used_times) })
        .eq("code", code);
      console.error("llm error, rolled back", llmErr);
      if (llmErr instanceof Error && llmErr.message === "blocked_content") {
        return NextResponse.json(
          { error: `${userMessages.blockedContent}（次数已回滚，请修改内容后重试）` },
          { status: 400 }
        );
      }
      const mapped = mapLlmErrorToResponse(llmErr);
      return NextResponse.json(
        { error: `${mapped.error}（次数已回滚）`, code: mapped.code },
        { status: mapped.status }
      );
    }

    const contentHash = await sha256(`${resume}\n${jd}`);
    await supabase.from("usage_log").insert({
      card_code: code,
      content_hash: contentHash,
      report_text: aiContent,
      level,
      request_id: request_id || null,
      ip,
    });

    return NextResponse.json({
      status: "success",
      remaining: redeem.remaining,
      level,
      aiContent,
    });
  } catch (e) {
    console.error("use-card error", e);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
