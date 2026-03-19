import session from "express-session";
import { RedisStore } from "connect-redis";
import Redis from "ioredis";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function resolveSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-session-secret";
}

function resolveCookieDomain(): string | undefined {
  if (isProduction()) {
    return ".boreal.financial";
  }

  return undefined;
}

function buildRedisStore(): session.Store | undefined {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return undefined;
  }

  const redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableAutoPipelining: true,
  });

  redisClient.on("error", (error) => {
    console.error("redis_session_store_error", error);
  });

  void redisClient.connect().catch((error) => {
    console.error("redis_session_store_connect_error", error);
  });

  return new RedisStore({
    client: redisClient,
    prefix: "staff:sess:",
    ttl: Math.floor(ONE_DAY_MS / 1000),
  });
}

const store = buildRedisStore();

if (isProduction() && !store) {
  throw new Error("REDIS_URL is required in production for session persistence.");
}

export const sessionMiddleware = session({
  name: "bf.sid",
  secret: resolveSessionSecret(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  store,
  cookie: {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    domain: resolveCookieDomain(),
    maxAge: ONE_DAY_MS,
  },
});
