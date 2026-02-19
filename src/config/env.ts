import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`❌ Missing required ENV variable: ${name}\n`);
    process.exit(1);
  }
  return value;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 8080),
  JWT_SECRET: required("JWT_SECRET"),
  TWILIO_MODE: process.env.TWILIO_MODE || "live",
};

export function isTestEnv(): boolean {
  return ENV.NODE_ENV === "test";
}

export function isProductionEnv(): boolean {
  return ENV.NODE_ENV === "production";
}

function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getAccessTokenSecret(): string | undefined {
  return getEnvValue("JWT_SECRET");
}

export function getRefreshTokenSecret(): string | undefined {
  return getEnvValue("JWT_REFRESH_SECRET");
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseDurationToMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;
  const unit = (match[2] ?? "s").toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

export function assertEnv(): void {
  required("JWT_SECRET");
  required("CORS_ALLOWED_ORIGINS");
  required("RATE_LIMIT_WINDOW_MS");
  required("RATE_LIMIT_MAX");
}

export function validateEnv(): void {
  required("JWT_SECRET");
}

export function getCorsAllowlist(): string[] {
  const value = getEnvValue("CORS_ALLOWED_ORIGINS");
  return value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [];
}

export function getGlobalRateLimitWindowMs(): number {
  return parsePositiveInt(getEnvValue("RATE_LIMIT_WINDOW_MS"), 15 * 60 * 1000);
}

export function getGlobalRateLimitMax(): number {
  return parsePositiveInt(getEnvValue("RATE_LIMIT_MAX"), 100);
}

export function getAppInsightsConnectionString(): string {
  return getEnvValue("APPINSIGHTS_CONNECTION_STRING") ?? "";
}

export function getJwtExpiresIn(): string {
  return getEnvValue("JWT_EXPIRES_IN") ?? "15m";
}

export function getJwtRefreshExpiresIn(): string {
  return getEnvValue("JWT_REFRESH_EXPIRES_IN") ?? "30d";
}

export function getJwtRefreshExpiresInMs(): number {
  return parseDurationToMs(getJwtRefreshExpiresIn(), 30 * 24 * 60 * 60 * 1000);
}

export function getJwtClockSkewSeconds(): number {
  return parsePositiveInt(getEnvValue("JWT_CLOCK_SKEW_SECONDS"), 60);
}
