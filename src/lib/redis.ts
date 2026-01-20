import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let memoryClient: RedisClient | null = null;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return p;
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("REDIS_CONNECT_TIMEOUT")), ms);
    }),
  ]);
}

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || "";
  if (!url) return null;

  const g = globalThis as any;
  if (g.__redisClient) return g.__redisClient as RedisClient;

  if (memoryClient) return memoryClient;

  const connectTimeoutMs = Math.max(1, Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 1500));

  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: connectTimeoutMs,
      reconnectStrategy: () => false,
    },
  } as any);
  client.on("error", () => {});

  try {
    if (!client.isOpen) await withTimeout(client.connect(), connectTimeoutMs);
  } catch {
    try {
      await client.disconnect();
    } catch {}
    return null;
  }

  g.__redisClient = client;
  memoryClient = client;
  return client;
}

export async function redisGetTtlMs(key: string): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const ttl = await redis.pTTL(key);
    if (typeof ttl !== "number") return null;
    if (ttl < 0) return null;
    return ttl;
  } catch {
    return null;
  }
}
