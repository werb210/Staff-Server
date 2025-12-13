import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

/**
 * =========================
 * Base env (always required)
 * =========================
 */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
});

/**
 * ==========================================================
 * Auth / token config (required for build-time typing + runtime)
 * ==========================================================
 *
 * IMPORTANT:
 * - TOKEN_TRANSPORT MUST include "body" because token.helpers.ts checks it.
 * - These are DEFAULTED so builds don’t explode if you don’t use them yet,
 *   but the types exist so TS stops failing.
 */
const authSchema = z.object({
  TOKEN_TRANSPORT: z.enum(["cookie", "header", "body"]).default("cookie"),

  ACCESS_TOKEN_SECRET: z.string().min(32).default(process.env.JWT_SECRET ?? "x".repeat(64)),
  REFRESH_TOKEN_SECRET: z.string().min(32).default(process.env.JWT_SECRET ?? "y".repeat(64)),

  // You can use "15m", "7d", etc. If you treat these as numbers elsewhere, change there.
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

  // Optional helper (if you ever support where refresh token is sent)
  REFRESH_TOKEN_TRANSPORT: z.enum(["cookie", "header", "body"]).optional(),
});

/**
 * ==============================
 * Azure Blob (REQUIRED in prod)
 * ==============================
 */
const azureSchema = z.object({
  AZURE_BLOB_ACCOUNT: z.string().min(1),
  AZURE_BLOB_KEY: z.string().min(1),
  AZURE_BLOB_CONTAINER: z.string().min(1),
});

/**
 * ==============================
 * Optional / legacy compatibility
 * ==============================
 * These exist because older code paths often reference them.
 * Making them OPTIONAL prevents TS failures without forcing runtime requirements.
 */
const legacySchema = z.object({
  AZURE_POSTGRES_URL: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER_BF: z.string().optional(),
  TWILIO_PHONE_NUMBER_SLF: z.string().optional(),
});

/**
 * Parse + type env
 */
let parsedBase: z.infer<typeof baseSchema>;
try {
  parsedBase = baseSchema.parse(process.env);
} catch (err) {
  const message =
    err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      : String(err);
  throw new Error(`Invalid environment configuration: ${message}`);
}

let parsedAuth: z.infer<typeof authSchema>;
try {
  parsedAuth = authSchema.parse(process.env);
} catch (err) {
  const message =
    err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      : String(err);
  throw new Error(`Invalid auth configuration: ${message}`);
}

let parsedAzure: z.infer<typeof azureSchema> | null = null;
if (isProd) {
  try {
    parsedAzure = azureSchema.parse(process.env);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
        : String(err);
    throw new Error(`Azure Blob configuration missing in production: ${message}`);
  }
}

let parsedLegacy: z.infer<typeof legacySchema>;
try {
  parsedLegacy = legacySchema.parse(process.env);
} catch {
  parsedLegacy = {};
}

/**
 * ======================
 * Exports used by the app
 * ======================
 */
export const config = {
  DATABASE_URL: parsedBase.DATABASE_URL,
  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",
  PORT: parsedBase.PORT ?? "5000",

  // Azure Blob (null in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzure?.AZURE_BLOB_ACCOUNT ?? null,
  AZURE_BLOB_KEY: parsedAzure?.AZURE_BLOB_KEY ?? null,
  AZURE_BLOB_CONTAINER: parsedAzure?.AZURE_BLOB_CONTAINER ?? null,

  // Legacy/compat
  AZURE_POSTGRES_URL: parsedLegacy.AZURE_POSTGRES_URL ?? null,

  TWILIO_ACCOUNT_SID: parsedLegacy.TWILIO_ACCOUNT_SID ?? null,
  TWILIO_AUTH_TOKEN: parsedLegacy.TWILIO_AUTH_TOKEN ?? null,
  TWILIO_PHONE_NUMBER_BF: parsedLegacy.TWILIO_PHONE_NUMBER_BF ?? null,
  TWILIO_PHONE_NUMBER_SLF: parsedLegacy.TWILIO_PHONE_NUMBER_SLF ?? null,
};

/**
 * IMPORTANT:
 * This is what your token.helpers.ts expects:
 *   import { authConfig } from "../config/config";
 */
export const authConfig = {
  TOKEN_TRANSPORT: parsedAuth.TOKEN_TRANSPORT,
  ACCESS_TOKEN_SECRET: parsedAuth.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: parsedAuth.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: parsedAuth.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN: parsedAuth.REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_TRANSPORT: parsedAuth.REFRESH_TOKEN_TRANSPORT,
} as const;
