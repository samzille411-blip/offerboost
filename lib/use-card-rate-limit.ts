import { NextResponse } from "next/server";
import { enforceUseCardRateLimit as enforceUseCardRateLimitRedis } from "@/lib/upstash-rate-limit";

type CardSnapshot = {
  exists: boolean;
  hasRemaining: boolean;
};

/** 有效卡按卡号限流；无效/耗尽卡按 IP 加严（Upstash 优先，内存兜底） */
export async function enforceUseCardRateLimit(
  req: Request,
  cardCode: string,
  card: CardSnapshot
): Promise<NextResponse | null> {
  return enforceUseCardRateLimitRedis(req, cardCode, card);
}
