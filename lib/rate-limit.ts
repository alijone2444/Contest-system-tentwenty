import { NextRequest } from "next/server";
import { Errors } from "./errors";

/**
 * Sliding-window in-memory rate limiter.
 *
 * Note: on serverless (Vercel) this is per-instance, which is acceptable for
 * this project's scale. For multi-instance production traffic, swap the store
 * for Redis (e.g. Upstash) — the call sites stay the same.
 */
const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000;

function clientKey(req: NextRequest, scope: string, userId?: string) {
  if (userId) return `${scope}:user:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:ip:${ip}`;
}

export function rateLimit(
  req: NextRequest,
  scope: string,
  opts: { limit: number; windowMs: number; userId?: string }
) {
  const key = clientKey(req, scope, opts.userId);
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= opts.limit) {
    const retryAfter = Math.ceil((timestamps[0] + opts.windowMs - now) / 1000);
    throw Errors.tooMany(
      `Rate limit exceeded (${opts.limit} requests / ${Math.round(opts.windowMs / 1000)}s). Retry in ~${retryAfter}s.`
    );
  }
  timestamps.push(now);
  buckets.set(key, timestamps);

  // Prevent unbounded memory growth.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, ts] of buckets) {
      if (ts.every((t) => t <= windowStart)) buckets.delete(k);
      if (buckets.size <= MAX_BUCKETS / 2) break;
    }
  }
}

/** Preset policies. */
export const RateLimits = {
  auth: { limit: 10, windowMs: 60_000 }, // login/signup: 10/min per IP
  read: { limit: 60, windowMs: 60_000 }, // listings, leaderboards: 60/min
  write: { limit: 20, windowMs: 60_000 }, // join/submit: 20/min
};
