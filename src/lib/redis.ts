import Redis from "ioredis";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(...args: unknown[]): Promise<"OK">;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
};

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};

class MemoryRedis implements RedisLike {
  private readonly store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<"OK"> {
    const expiresAt =
      mode === "EX" && typeof ttlSeconds === "number"
        ? Date.now() + ttlSeconds * 1000
        : null;

    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return -2;
    }

    if (entry.expiresAt === null) {
      return -1;
    }

    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }

    return Math.ceil(remainingMs / 1000);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

function createRedisClient(): RedisLike {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[REDIS] REDIS_URL missing, using in-memory fallback");
    return new MemoryRedis();
  }

  const client = new Redis(redisUrl, {
    tls: {},
    maxRetriesPerRequest: null,
  });

  client.on("connect", () => console.log("[REDIS CONNECTED]"));
  client.on("error", (err) => console.error("[REDIS ERROR]", err));

  return client;
}

export const redis = createRedisClient();
