import { getRedis } from "../lib/redis";
import { config } from "../config";
import { dbQuery } from "../db";

export async function bootstrap(): Promise<void> {
  await dbQuery("SELECT 1");

  const redis = getRedis();
  if (config.redis.url && config.env !== "test" && redis) {
    try {
      if (redis.ping) {
        await redis.ping();
      }
    } catch {
      console.warn("Redis unavailable — continuing");
    }
  }
}
