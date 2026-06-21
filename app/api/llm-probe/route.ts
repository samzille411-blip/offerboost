import { NextResponse } from "next/server";
import { probeLlm } from "@/lib/llm-probe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/** 极轻量 LLM 探活（每个浏览器会话首次分析前调用，消耗极少 token） */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const max = Number(process.env.RATE_LIMIT_MAX_PROBE || 3);
  if (!checkRateLimit(`llm-probe:${ip}`, max)) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const result = await probeLlm();
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
