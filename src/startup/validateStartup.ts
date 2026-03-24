import { config } from "../config";

export function validateStartup() {
  if (!config.db.url) {
    throw new Error("DATABASE_URL missing");
  }

  if (!config.jwt.secret) {
    throw new Error("JWT secret missing");
  }

  if (!config.redis.url && config.env !== "test") {
    throw new Error("REDIS_URL missing");
  }
}
