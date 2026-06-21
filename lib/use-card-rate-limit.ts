import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, sha256 } from "@/lib/rate-limit";
import { userMessages } from "@/lib/user-messages";

type CardSnapshot = {
  exists: boolean;
  hasRemaining: boolean;
};

function rateLimitedResponse() {
  return NextResponse.json(
    { error: `${userMessages.rateLimited}（本次未扣次数）`, code: "rate_limited" },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/** 有效卡按卡号限流；无效/耗尽卡按 IP 加严，防刷码 */
export async function enforceUseCardRateLimit(
  req: Request,
  cardCode: string,
  card: CardSnapshot
): Promise<NextResponse | null> {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);

  if (card.exists && card.hasRemaining) {
    const cardKey = await sha256(cardCode.trim());
    const max = Number(process.env.RATE_LIMIT_MAX_USE_CARD_VALID || 15);
    if (!checkRateLimit(`use-card:valid:${cardKey}`, max, windowMs)) {
      return rateLimitedResponse();
    }
    return null;
  }

  const ip = getClientIp(req);
  const max = Number(process.env.RATE_LIMIT_MAX_USE_CARD_INVALID || 5);
  if (!checkRateLimit(`use-card:invalid:${ip}`, max, windowMs)) {
    return rateLimitedResponse();
  }
  return null;
}
