import { z } from "zod";

const schema = z.object({
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type Env = z.infer<typeof schema> & {
  JWT_SECRET: string;
};

let cached: Env | undefined;

export function validateEnv() {
  const isTest =
    process.env.NODE_ENV === "test" || process.env.CI === "true";

  const result = schema.safeParse(process.env);

  if (!result.success && !isTest) {
    console.error("ENV VALIDATION FAILED:", result.error.flatten());
    process.exit(1);
  }

  if (!result.success && isTest) {
    // In CI/test: do NOT fail hard
    return {};
  }

  return result.data;
}

export function getEnv(): Env {
  if (!cached) {
    const parsed = validateEnv();
    const nodeEnv = process.env.NODE_ENV;
    cached = {
      ...parsed,
      NODE_ENV:
        nodeEnv === "development" || nodeEnv === "test" || nodeEnv === "production"
          ? nodeEnv
          : undefined,
      JWT_SECRET: process.env.JWT_SECRET || "test-secret",
    };
  }

  return cached;
}

export function resetEnvCacheForTests() {
  cached = undefined;
}
