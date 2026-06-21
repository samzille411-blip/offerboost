import { NextResponse } from "next/server";
import { enforceProbeRateLimit } from "@/lib/upstash-rate-limit";
import { probeLlm } from "@/lib/llm-probe";

/** 极轻量 LLM 探活（每个浏览器会话首次分析前调用，消耗极少 token） */
export async function POST(req: Request) {
  const limited = await enforceProbeRateLimit(req);
  if (limited) return limited;

  const result = await probeLlm();
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
