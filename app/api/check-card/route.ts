import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { enforceUseCardRateLimit } from "@/lib/upstash-rate-limit";

export const dynamic = "force-dynamic";

/** 轻量查询卡密剩余次数（不扣次、不调 LLM） */
export async function GET(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();
    if (!code) {
      return NextResponse.json({ error: "缺少卡密参数" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: card, error } = await supabase
      .from("cards")
      .select("code, total_times, used_times, level")
      .eq("code", code)
      .maybeSingle();

    const exists = !!card && !error;
    const hasRemaining = exists && card.used_times < card.total_times;

    const rateLimited = await enforceUseCardRateLimit(req, code, { exists, hasRemaining });
    if (rateLimited) return rateLimited;

    if (!exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        exhausted: false,
        remaining: 0,
        total_times: 0,
        used_times: 0,
      });
    }

    const remaining = Math.max(0, card.total_times - card.used_times);
    return NextResponse.json({
      ok: true,
      exists: true,
      exhausted: remaining <= 0,
      remaining,
      total_times: card.total_times,
      used_times: card.used_times,
      level: card.level,
    });
  } catch (e) {
    console.error("check-card error", e);
    return NextResponse.json({ error: "查询失败，请稍后重试", code: "check_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body?.card_code || body?.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: "缺少卡密参数" }, { status: 400 });
    }
    const url = new URL(req.url);
    url.searchParams.set("code", code);
    return GET(new Request(url.toString(), { headers: req.headers }));
  } catch (e) {
    console.error("check-card post error", e);
    return NextResponse.json({ error: "查询失败，请稍后重试", code: "check_failed" }, { status: 500 });
  }
}
