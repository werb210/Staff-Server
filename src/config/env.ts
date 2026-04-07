import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
});

let cached: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  if (!cached) {
    const nodeEnv = process.env.NODE_ENV ?? "development";

    if (nodeEnv !== "production") {
      process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
      process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "test-key";
    }

    const safeEnv = envSchema.safeParse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    });

    if (!safeEnv.success) {
      console.error("ENV VALIDATION FAILED:", safeEnv.error.flatten());
      cached = {
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV as "development" | "test" | "production" | undefined,
        JWT_SECRET: process.env.JWT_SECRET ?? "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      };
    } else {
      cached = safeEnv.data;
    }
  }

  return cached;
}

export const env = getEnv();

export function validateRuntimeEnvOrExit() {
  return getEnv();
}

export function resetEnvCacheForTests() {
  cached = undefined;
}
