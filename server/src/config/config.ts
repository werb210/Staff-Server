import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

/**
 * Helpers
 */
function zRequiredInProd(name: string) {
  return z
    .string()
    .min(1, `${name} is required`)
    .transform(v => v.trim());
}

function getOrDevDefault(name: string, devDefault: string) {
  const v = process.env[name];
  if (v && v.trim().length > 0) return v.trim();
  if (isProd) throw new Error(`Missing required env var in production: ${name}`);
  return devDefault;
}

/**
 * Core env (always required)
 */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  NODE_ENV: z.string().optional(),
  PORT: z
    .union([z.string(), z.number()])
    .optional()
    .transform(v => (v == null ? undefined : String(v))),
  // Some parts of the code reference this legacy name
  AZURE_POSTGRES_URL: z.string().optional(),
});

/**
 * Azure Blob is REQUIRED only in production
 */
const azureSchema = z.object({
  AZURE_BLOB_ACCOUNT: zRequiredInProd("AZURE_BLOB_ACCOUNT"),
  AZURE_BLOB_KEY: zRequiredInProd("AZURE_BLOB_KEY"),
  AZURE_BLOB_CONTAINER: zRequiredInProd("AZURE_BLOB_CONTAINER"),
});

/**
 * Auth/token config (your code expects these to exist on config/authConfig)
 */
const authSchema = z.object({
  TOKEN_TRANSPORT: z.enum(["cookie", "header"]).optional(),
  ACCESS_TOKEN_SECRET: z.string().min(64).optional(),
  REFRESH_TOKEN_SECRET: z.string().min(64).optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).optional(),
});

/**
 * Twilio (your sms.service references these)
 * If you don’t use Twilio in prod yet, set them anyway or disable that code path.
 */
const twilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER_BF: z.string().optional(),
  TWILIO_PHONE_NUMBER_SLF: z.string().optional(),
});

/**
 * Parse base
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

/**
 * Parse optional groups (conditionally enforced)
 */
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

let parsedTwilio: z.infer<typeof twilioSchema>;
try {
  parsedTwilio = twilioSchema.parse(process.env);
} catch (err) {
  const message =
    err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      : String(err);
  throw new Error(`Invalid Twilio configuration: ${message}`);
}

/**
 * Build final config objects with safe dev defaults.
 * In production, required values MUST exist (via getOrDevDefault).
 */
const PORT = Number(parsedBase.PORT ?? "5000");

export const authConfig = {
  TOKEN_TRANSPORT: (parsedAuth.TOKEN_TRANSPORT ?? "cookie") as "cookie" | "header",
  ACCESS_TOKEN_SECRET: getOrDevDefault(
    "ACCESS_TOKEN_SECRET",
    "dev_access_token_secret__replace_me___________________________________________",
  ),
  REFRESH_TOKEN_SECRET: getOrDevDefault(
    "REFRESH_TOKEN_SECRET",
    "dev_refresh_token_secret__replace_me__________________________________________",
  ),
  ACCESS_TOKEN_EXPIRES_IN: parsedAuth.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  REFRESH_TOKEN_EXPIRES_IN: parsedAuth.REFRESH_TOKEN_EXPIRES_IN ?? "30d",
};

export const config = {
  DATABASE_URL: parsedBase.DATABASE_URL,
  // Some code may still reference AZURE_POSTGRES_URL; map it to DATABASE_URL if unset.
  AZURE_POSTGRES_URL: parsedBase.AZURE_POSTGRES_URL ?? parsedBase.DATABASE_URL,

  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",
  PORT,

  // Azure Blob (null in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzure?.AZURE_BLOB_ACCOUNT ?? null,
  AZURE_BLOB_KEY: parsedAzure?.AZURE_BLOB_KEY ?? null,
  AZURE_BLOB_CONTAINER: parsedAzure?.AZURE_BLOB_CONTAINER ?? null,

  // Twilio (exists on config so TS compile succeeds)
  TWILIO_ACCOUNT_SID: parsedTwilio.TWILIO_ACCOUNT_SID ?? null,
  TWILIO_AUTH_TOKEN: parsedTwilio.TWILIO_AUTH_TOKEN ?? null,
  TWILIO_PHONE_NUMBER_BF: parsedTwilio.TWILIO_PHONE_NUMBER_BF ?? null,
  TWILIO_PHONE_NUMBER_SLF: parsedTwilio.TWILIO_PHONE_NUMBER_SLF ?? null,
};
