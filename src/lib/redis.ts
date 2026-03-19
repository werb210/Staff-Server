import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL missing");
}

export const redis = new Redis(process.env.REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: null,
});

redis.on("connect", () => console.log("[REDIS CONNECTED]"));
redis.on("error", (err) => console.error("[REDIS ERROR]", err));
