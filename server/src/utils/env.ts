// ============================================================================
// server/src/utils/env.ts
// BLOCK 31 — Environment Loader + Validation
// ============================================================================

import dotenv from "dotenv";
dotenv.config();

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalEnv(name: string, defaultValue = ""): string {
  return getEnv(name) ?? defaultValue;
}

const REQUIRED_KEYS = ["DATABASE_URL", "JWT_SECRET"];
const missing = REQUIRED_KEYS.filter((key) => !getEnv(key));
if (missing.length > 0) {
  console.warn(
    `⚠️  Missing required environment variables: ${missing.join(", ")} — features depending on them will be disabled.`,
  );
}

export const ENV = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: optionalEnv("PORT", "5000"),

  // Database
  DATABASE_URL: getEnv("DATABASE_URL"),

  // JWT
  JWT_SECRET: getEnv("JWT_SECRET"),

  // Email
  SENDGRID_API_KEY: optionalEnv("SENDGRID_API_KEY"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", "no-reply@boreal.financial"),

  // Twilio
  TWILIO_ACCOUNT_SID: optionalEnv("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: optionalEnv("TWILIO_AUTH_TOKEN"),
  TWILIO_PHONE_NUMBER: optionalEnv("TWILIO_PHONE_NUMBER"),

  // Azure Blob Storage
  AZURE_STORAGE_CONNECTION_STRING: optionalEnv(
    "AZURE_STORAGE_CONNECTION_STRING",
  ),
  AZURE_BLOB_CONTAINER: optionalEnv("AZURE_BLOB_CONTAINER", "documents"),

  // AI
  OPENAI_API_KEY: optionalEnv("OPENAI_API_KEY"),

  // Flags
  DEBUG: optionalEnv("DEBUG") === "true",
  SKIP_DATABASE: optionalEnv("SKIP_DATABASE") === "true",
  REQUIRE_DATABASE: optionalEnv("REQUIRE_DATABASE") === "true",
};

// ============================================================================
// END OF FILE
// ============================================================================
