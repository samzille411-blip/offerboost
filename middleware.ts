import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; reset: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

const WINDOW_MS = 60_000;

export function middleware(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;

  if (path === "/api/use-card") {
    const max = Number(process.env.RATE_LIMIT_MAX_USE_CARD || 5);
    if (!checkRateLimit(`mw:use-card:${ip}`, max, WINDOW_MS)) {
      return NextResponse.json(
        { error: "操作过于频繁，请稍后再试", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/use-card"],
};
