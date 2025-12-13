import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

/**
 * Helpers
 */
const asInt = (v: unknown, fallback: number) => {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Base env (always required)
 */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
});

/**
 * Auth / token env (required for auth module)
 */
const authSchema = z.object({
  TOKEN_TRANSPORT: z.enum(["cookie", "header", "body"]).default("header"),

  ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 chars"),
  REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET must be at least 32 chars"),

  ACCESS_TOKEN_EXPIRES_IN: z.string().optional(), // seconds
  REFRESH_TOKEN_EXPIRES_IN: z.string().optional(), // seconds
});

/**
 * Twilio (optional, but must exist as properties because services reference them)
 */
const twilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER_BF: z.string().optional(),
  TWILIO_PHONE_NUMBER_SLF: z.string().optional(),
});

/**
 * Azure Blob is REQUIRED only in production
 */
const azureBlobSchema = z.object({
  AZURE_BLOB_ACCOUNT: z.string().min(1, "AZURE_BLOB_ACCOUNT is required in production"),
  AZURE_BLOB_KEY: z.string().min(1, "AZURE_BLOB_KEY is required in production"),
  AZURE_BLOB_CONTAINER: z.string().min(1, "AZURE_BLOB_CONTAINER is required in production"),
});

/**
 * Optional / legacy compat
 */
const optionalSchema = z.object({
  AZURE_POSTGRES_URL: z.string().optional(),
});

let parsedBase: z.infer<typeof baseSchema>;
let parsedAuth: z.infer<typeof authSchema>;
let parsedTwilio: z.infer<typeof twilioSchema>;
let parsedOptional: z.infer<typeof optionalSchema>;
let parsedAzureBlob: z.infer<typeof azureBlobSchema> | undefined;

try {
  parsedBase = baseSchema.parse(process.env);
  parsedAuth = authSchema.parse(process.env);
  parsedTwilio = twilioSchema.parse(process.env);
  parsedOptional = optionalSchema.parse(process.env);
} catch (err) {
  const message =
    err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      : String(err);
  throw new Error(`Invalid environment configuration: ${message}`);
}

if (isProd) {
  try {
    parsedAzureBlob = azureBlobSchema.parse(process.env);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
        : String(err);
    throw new Error(`Azure Blob configuration missing in production: ${message}`);
  }
}

/**
 * Exported configs
 * IMPORTANT: use `undefined` for “not set” (NOT `null`) to avoid TS2322 string|null errors.
 */
export const config = {
  DATABASE_URL: parsedBase.DATABASE_URL,
  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",
  PORT: asInt(parsedBase.PORT, 5000),

  // Azure Blob (undefined in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzureBlob?.AZURE_BLOB_ACCOUNT,
  AZURE_BLOB_KEY: parsedAzureBlob?.AZURE_BLOB_KEY,
  AZURE_BLOB_CONTAINER: parsedAzureBlob?.AZURE_BLOB_CONTAINER,

  // Optional / legacy
  AZURE_POSTGRES_URL: parsedOptional.AZURE_POSTGRES_URL,

  // Twilio (optional values but always-present properties)
  TWILIO_ACCOUNT_SID: parsedTwilio.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: parsedTwilio.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER_BF: parsedTwilio.TWILIO_PHONE_NUMBER_BF,
  TWILIO_PHONE_NUMBER_SLF: parsedTwilio.TWILIO_PHONE_NUMBER_SLF,
} as const;

export const authConfig = {
  TOKEN_TRANSPORT: parsedAuth.TOKEN_TRANSPORT,

  ACCESS_TOKEN_SECRET: parsedAuth.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: parsedAuth.REFRESH_TOKEN_SECRET,

  // defaults: 15m access, 30d refresh (seconds)
  ACCESS_TOKEN_EXPIRES_IN: asInt(parsedAuth.ACCESS_TOKEN_EXPIRES_IN, 60 * 15),
  REFRESH_TOKEN_EXPIRES_IN: asInt(parsedAuth.REFRESH_TOKEN_EXPIRES_IN, 60 * 60 * 24 * 30),
} as const;
