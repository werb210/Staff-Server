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
});

/**
 * Azure Blob is REQUIRED only in production
 */
const azureSchema = z.object({
  AZURE_BLOB_ACCOUNT: z.string().min(1),
  AZURE_BLOB_KEY: z.string().min(1),
  AZURE_BLOB_CONTAINER: z.string().min(1),
});

let parsedBase;
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
  DATABASE_URL: parsedBase.DATABASE_URL,
  JWT_SECRET: parsedBase.JWT_SECRET,
  NODE_ENV: parsedBase.NODE_ENV ?? "development",

  // Azure Blob (null in dev, required in prod)
  AZURE_BLOB_ACCOUNT: parsedAzure?.AZURE_BLOB_ACCOUNT ?? null,
  AZURE_BLOB_KEY: parsedAzure?.AZURE_BLOB_KEY ?? null,
  AZURE_BLOB_CONTAINER: parsedAzure?.AZURE_BLOB_CONTAINER ?? null,
};
