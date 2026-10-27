// Simple in-memory sliding-window rate limiter. Suitable for single-instance
// Next.js (dev + a single serverless container). For multi-instance deploys,
// replace the Map with Supabase/Redis — the API stays the same.

type Hit = { at: number };

const buckets = new Map<string, Hit[]>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((h) => h.at > cutoff);
  if (hits.length >= max) {
    const oldest = hits[0].at;
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, oldest + windowMs - now) };
  }
  hits.push({ at: now });
  buckets.set(key, hits);
  return { ok: true, remaining: Math.max(0, max - hits.length), retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function getClientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}
