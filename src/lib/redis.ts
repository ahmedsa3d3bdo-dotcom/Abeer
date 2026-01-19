import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let memoryClient: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || "";
  if (!url) return null;

  const g = globalThis as any;
  if (g.__redisClient) return g.__redisClient as RedisClient;

  if (memoryClient) return memoryClient;

  const client = createClient({ url });
  client.on("error", () => {});

  try {
    if (!client.isOpen) await client.connect();
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
