const buckets = new Map<string, { count: number; reset: number }>();

const MAX_BUCKETS = 5000;
const PRUNE_INTERVAL_MS = 60_000;
let lastPruneAt = 0;

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS && now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  buckets.forEach((entry, key) => {
    if (now > entry.reset) buckets.delete(key);
  });
}

export function checkRateLimit(
  ip: string,
  max: number,
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
): boolean {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const entry = buckets.get(ip);
  if (!entry || now > entry.reset) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
