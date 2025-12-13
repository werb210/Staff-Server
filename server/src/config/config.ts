import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

/**
 * Base env (always required)
 */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(), // optional because Azure injects PORT at runtime sometimes
});

/**
 * JWT/token configuration (required by your token helpers + jwt service)
 * In prod: allow explicit override via env.
 * In dev: default to deterministic values derived from JWT_SECRET so TS/build never breaks.
 */
const tokenSchema = z.object({
  TOKEN_TRANSPORT: z.enum(["cookie", "header"]).optional(),
  ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).optional(),
});

/**
 * Azure Blob is REQUIRED only in production
 */
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

let parsedTokens: z.infer<typeof tokenSchema>;
try {
  parsedTokens = tokenSchema.parse(process.env);
} catch (err) {
  const message =
    err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      : String(err);
  throw new Error(`Invalid token configuration: ${message}`);
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

// Defaults so builds never fail when you haven't set these explicitly.
const ACCESS_TOKEN_SECRET =
  parsedTokens.ACCESS_TOKEN_SECRET ?? `${parsedBase.JWT_SECRET}__access_token_secret__`;
const REFRESH_TOKEN_SECRET =
  parsedTokens.REFRESH_TOKEN_SECRET ?? `${parsedBase.JWT_SECRET}__refresh_token_secret__`;

export const config = {
  DATABASE_URL: parsedBase.DATABASE_URL,
  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",
  PORT: parsedBase.PORT ?? "5000",

  // Token/JWT settings (these are the missing keys causing your build to fail)
  TOKEN_TRANSPORT: parsedTokens.TOKEN_TRANSPORT ?? "cookie",
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: parsedTokens.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  REFRESH_TOKEN_EXPIRES_IN: parsedTokens.REFRESH_TOKEN_EXPIRES_IN ?? "30d",

  // Azure Blob (null in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzure?.AZURE_BLOB_ACCOUNT ?? null,
  AZURE_BLOB_KEY: parsedAzure?.AZURE_BLOB_KEY ?? null,
  AZURE_BLOB_CONTAINER: parsedAzure?.AZURE_BLOB_CONTAINER ?? null,
} as const;
