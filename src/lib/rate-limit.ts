// Simple in-memory rate limiter for server runtime. Suitable for dev/single-instance.
// For production with multiple instances, use Redis or another shared store.

import { getRedisClient, redisGetTtlMs } from "./redis";

type Entry = { count: number; resetAt: number };
const bucket = new Map<string, Entry>();

export async function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();

  const redis = await getRedisClient();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pExpire(key, windowMs);
      }

      const ttl = await redisGetTtlMs(key);
      const resetAt = ttl != null ? now + ttl : now + windowMs;

      if (count > limit) {
        return { ok: false, remaining: 0, resetAt };
      }

      return { ok: true, remaining: Math.max(0, limit - count), resetAt };
    } catch {
    }
  }

  const entry = bucket.get(key);
  if (!entry || now > entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}
