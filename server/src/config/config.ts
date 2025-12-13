import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

/**
 * NOTE:
 * - Keep schema permissive enough that TypeScript builds don’t fail due to missing optional integration vars.
 * - Enforce the *real* hard requirements:
 *   - DATABASE_URL + JWT_SECRET always
 *   - Azure Blob vars required only in production runtime
 */

const baseSchema = z.object({
  // Required always
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),

  // Optional / defaults
  NODE_ENV: z.string().optional(),
  PORT: z
    .union([z.string().min(1), z.number()])
    .optional()
    .transform(v => (v === undefined ? undefined : String(v))),

  /**
   * Legacy/compat: some code may still reference AZURE_POSTGRES_URL.
   * If present, it should be a connection string; otherwise we fall back to DATABASE_URL.
   */
  AZURE_POSTGRES_URL: z.string().min(1).optional(),

  /**
   * Twilio is optional (build should not fail if not configured).
   * If your code requires these at runtime, the service layer should throw a clear error when used.
   */
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER_BF: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER_SLF: z.string().min(1).optional(),
});

const azureSchema = z.object({
  AZURE_BLOB_ACCOUNT: z.string().min(1),
  AZURE_BLOB_KEY: z.string().min(1),
  AZURE_BLOB_CONTAINER: z.string().min(1),
});

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

export const config = {
  // Core
  DATABASE_URL: parsedBase.DATABASE_URL,
  // Legacy alias used in some modules
  AZURE_POSTGRES_URL: parsedBase.AZURE_POSTGRES_URL ?? parsedBase.DATABASE_URL,

  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",
  PORT: parsedBase.PORT ?? "5000",

  // Azure Blob (null in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzure?.AZURE_BLOB_ACCOUNT ?? null,
  AZURE_BLOB_KEY: parsedAzure?.AZURE_BLOB_KEY ?? null,
  AZURE_BLOB_CONTAINER: parsedAzure?.AZURE_BLOB_CONTAINER ?? null,

  // Twilio (optional)
  TWILIO_ACCOUNT_SID: parsedBase.TWILIO_ACCOUNT_SID ?? null,
  TWILIO_AUTH_TOKEN: parsedBase.TWILIO_AUTH_TOKEN ?? null,
  TWILIO_PHONE_NUMBER_BF: parsedBase.TWILIO_PHONE_NUMBER_BF ?? null,
  TWILIO_PHONE_NUMBER_SLF: parsedBase.TWILIO_PHONE_NUMBER_SLF ?? null,
} as const;

/**
 * Back-compat export: some code imports authConfig from this module.
 * Keep it here so builds stop failing.
 */
export const authConfig = {
  JWT_SECRET: config.JWT_SECRET,
} as const;
