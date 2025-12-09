import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    AZURE_POSTGRES_URL: z.string().url({ message: "AZURE_POSTGRES_URL must be a valid URL" }),
    AZURE_BLOB_ACCOUNT: z.string().min(1, "AZURE_BLOB_ACCOUNT is required"),
    AZURE_BLOB_KEY: z.string().min(1, "AZURE_BLOB_KEY is required"),
    AZURE_BLOB_CONTAINER: z.string().min(1, "AZURE_BLOB_CONTAINER is required"),
    JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  })
  .transform((values) => ({
    ...values,
    AZURE_POSTGRES_URL: values.AZURE_POSTGRES_URL.trim(),
  }));

const resolvedEnv = {
  ...process.env,
  AZURE_POSTGRES_URL: process.env.AZURE_POSTGRES_URL || process.env.DATABASE_URL,
};

const parsed = envSchema.safeParse(resolvedEnv);

if (!parsed.success) {
  const message = parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = parsed.data;
