import dotenv from "dotenv";
import { logError, logWarn } from "../observability/logger";

dotenv.config();

const requiredRuntimeEnv = [
  "NODE_ENV",
  "DATABASE_URL",
  "JWT_REFRESH_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "CORS_ALLOWED_ORIGINS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
  "APPINSIGHTS_CONNECTION_STRING",
] as const;

type EnvConfig = {
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  corsAllowlist: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  appInsightsConnectionString: string;
};

let cachedEnv: EnvConfig | null = null;

export function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getAccessTokenSecret(): string | undefined {
  const jwtSecret = getEnvValue("JWT_SECRET");
  const authJwtSecret = getEnvValue("AUTH_JWT_SECRET");
  if (jwtSecret && authJwtSecret && jwtSecret !== authJwtSecret) {
    logError("env_conflict", {
      keys: ["JWT_SECRET", "AUTH_JWT_SECRET"],
    });
  }
  return jwtSecret ?? authJwtSecret;
}

function parsePositiveInt(value: string | undefined, fallback?: number): number {
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    logWarn("env_value_missing", { value: "missing" });
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (fallback !== undefined) {
      return fallback;
    }
    logWarn("env_value_invalid", { value });
    return 0;
  }
  return Math.floor(parsed);
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : fallback;
}

export function assertEnv(): void {
  if (isTestEnv()) {
    return;
  }
  const missing: string[] = requiredRuntimeEnv.filter(
    (key) => !getEnvValue(key)
  );
  if (!getAccessTokenSecret()) {
    missing.push("JWT_SECRET");
  }
  if (missing.length > 0) {
    logError("missing_env", { keys: missing });
  }
  const allowlist = parseCsv(
    getEnvValue("CORS_ALLOWED_ORIGINS") ?? getEnvValue("CORS_ALLOWLIST"),
    []
  );
  if (allowlist.includes("*")) {
    logError("cors_allowlist_wildcard_not_allowed");
  }
}

export function getEnvConfig(): EnvConfig {
  const currentNodeEnv = process.env.NODE_ENV ?? "";
  const shouldCache = currentNodeEnv.length > 0 && !isTestEnv();
  if (shouldCache && cachedEnv && cachedEnv.nodeEnv === currentNodeEnv) {
    return cachedEnv;
  }

  const treatAsTest = isTestEnv() || !currentNodeEnv;

  if (currentNodeEnv && !isTestEnv()) {
    assertEnv();
  }

  const testDefaults = {
    jwtExpiresIn: "15m",
    jwtRefreshExpiresIn: "30d",
    corsAllowlist: ["*"],
    rateLimitWindowMs: 60_000,
    rateLimitMax: 100,
    appInsightsConnectionString: "",
  };

  const nodeEnv = getEnvValue("NODE_ENV") ?? (treatAsTest ? "test" : currentNodeEnv);
  const databaseUrl =
    getEnvValue("DATABASE_URL") ?? (treatAsTest ? "" : "");
  const jwtSecret = getAccessTokenSecret() ?? (treatAsTest ? "test" : "");
  const jwtRefreshSecret =
    getEnvValue("JWT_REFRESH_SECRET") ?? (treatAsTest ? "test" : "");
  const jwtExpiresIn =
    getEnvValue("JWT_EXPIRES_IN") ??
    (treatAsTest ? testDefaults.jwtExpiresIn : "");
  const jwtRefreshExpiresIn =
    getEnvValue("JWT_REFRESH_EXPIRES_IN") ??
    (treatAsTest ? testDefaults.jwtRefreshExpiresIn : "");
  const corsAllowlist = parseCsv(
    getEnvValue("CORS_ALLOWED_ORIGINS") ?? getEnvValue("CORS_ALLOWLIST"),
    testDefaults.corsAllowlist
  );
  if (!treatAsTest && corsAllowlist.includes("*")) {
    logWarn("cors_allowlist_fallback", { corsAllowlist });
  }
  const rateLimitWindowMs = parsePositiveInt(
    getEnvValue("RATE_LIMIT_WINDOW_MS"),
    testDefaults.rateLimitWindowMs
  );
  const rateLimitMax = parsePositiveInt(
    getEnvValue("RATE_LIMIT_MAX"),
    testDefaults.rateLimitMax
  );
  const appInsightsConnectionString =
    getEnvValue("APPINSIGHTS_CONNECTION_STRING") ??
    (treatAsTest ? testDefaults.appInsightsConnectionString : "");

  const config: EnvConfig = {
    nodeEnv,
    databaseUrl,
    jwtSecret,
    jwtRefreshSecret,
    jwtExpiresIn,
    jwtRefreshExpiresIn,
    corsAllowlist,
    rateLimitWindowMs,
    rateLimitMax,
    appInsightsConnectionString,
  };

  if (shouldCache) {
    cachedEnv = config;
  }

  return config;
}

export function resetEnvConfig(): void {
  cachedEnv = null;
}

export function getCorsAllowlist(): string[] {
  return getEnvConfig().corsAllowlist;
}

export function getGlobalRateLimitWindowMs(): number {
  return getEnvConfig().rateLimitWindowMs;
}

export function getGlobalRateLimitMax(): number {
  return getEnvConfig().rateLimitMax;
}

export function getJwtExpiresIn(): string {
  return getEnvConfig().jwtExpiresIn;
}

export function getJwtRefreshExpiresIn(): string {
  return getEnvConfig().jwtRefreshExpiresIn;
}

export function getAppInsightsConnectionString(): string {
  return getEnvConfig().appInsightsConnectionString;
}
