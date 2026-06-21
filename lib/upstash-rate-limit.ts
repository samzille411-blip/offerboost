import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { userMessages } from "@/lib/user-messages";

export type LlmRateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function windowMs(): number {
  return Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
}

function windowDuration(): `${number} s` {
  const sec = Math.max(1, Math.floor(windowMs() / 1000));
  return `${sec} s`;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return new Redis({ url, token });
}

let analyzeIpLimiter: Ratelimit | null = null;
let globalLlmLimiter: Ratelimit | null = null;

function getAnalyzeIpLimiter(redis: Redis): Ratelimit {
  if (!analyzeIpLimiter) {
    analyzeIpLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(
        Number(process.env.RATE_LIMIT_MAX_ANALYZE) || 8,
        windowDuration()
      ),
      prefix: "offerboost:ip:analyze",
    });
  }
  return analyzeIpLimiter;
}

function getGlobalLlmLimiter(redis: Redis): Ratelimit {
  if (!globalLlmLimiter) {
    globalLlmLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(
        Number(process.env.GLOBAL_LLM_MAX_PER_MIN) || 80,
        windowDuration()
      ),
      prefix: "offerboost:global:llm",
    });
  }
  return globalLlmLimiter;
}

function rateLimitedResponse(
  code: "rate_limited" | "global_queue",
  message: string,
  suffix = ""
): NextResponse {
  return NextResponse.json(
    { error: `${message}${suffix}`, code },
    { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs() / 1000)) } }
  );
}

/** 免费分析调 LLM 前：单 IP + 全站（仅 cache miss 时调用） */
export async function enforceAnalyzeLlmRateLimit(req: Request): Promise<LlmRateLimitResult> {
  const ip = getClientIp(req);
  const ipMax = Number(process.env.RATE_LIMIT_MAX_ANALYZE) || 8;
  const globalMax = Number(process.env.GLOBAL_LLM_MAX_PER_MIN) || 80;
  const redis = getRedis();

  if (redis) {
    const { success: ipOk } = await getAnalyzeIpLimiter(redis).limit(ip);
    if (!ipOk) {
      return {
        ok: false,
        response: rateLimitedResponse("rate_limited", userMessages.rateLimitedIp),
      };
    }
    const { success: globalOk } = await getGlobalLlmLimiter(redis).limit("global_total");
    if (!globalOk) {
      return {
        ok: false,
        response: rateLimitedResponse("global_queue", userMessages.globalQueue),
      };
    }
    return { ok: true };
  }

  if (!checkRateLimit(`analyze-llm:${ip}`, ipMax, windowMs())) {
    return {
      ok: false,
      response: rateLimitedResponse("rate_limited", userMessages.rateLimited),
    };
  }
  if (!checkRateLimit("global-llm:total", globalMax, windowMs())) {
    return {
      ok: false,
      response: rateLimitedResponse("global_queue", userMessages.globalQueue),
    };
  }
  return { ok: true };
}

/** 付费解锁调 LLM 前：全站总限流（卡密/IP 限流仍由 use-card-rate-limit 负责） */
export async function enforcePremiumLlmGlobalRateLimit(): Promise<LlmRateLimitResult> {
  const globalMax = Number(process.env.GLOBAL_LLM_MAX_PER_MIN) || 80;
  const redis = getRedis();

  if (redis) {
    const { success } = await getGlobalLlmLimiter(redis).limit("global_total");
    if (!success) {
      return {
        ok: false,
        response: rateLimitedResponse(
          "global_queue",
          userMessages.globalQueue,
          "（本次未扣次数）"
        ),
      };
    }
    return { ok: true };
  }

  if (!checkRateLimit("global-llm:total", globalMax, windowMs())) {
    return {
      ok: false,
      response: rateLimitedResponse(
        "global_queue",
        userMessages.globalQueue,
        "（本次未扣次数）"
      ),
    };
  }
  return { ok: true };
}

export function isUpstashConfigured(): boolean {
  return !!getRedis();
}
