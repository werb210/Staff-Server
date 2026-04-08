type Env = {
  PORT?: string;
  NODE_ENV?: "development" | "test" | "production";
  JWT_SECRET: string;
  OPENAI_API_KEY?: string;
};

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    const nodeEnv = process.env.NODE_ENV as Env["NODE_ENV"];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret && nodeEnv !== "test") {
      throw new Error("❌ Missing env: JWT_SECRET");
    }

    cached = {
      PORT: process.env.PORT,
      NODE_ENV: nodeEnv,
      JWT_SECRET: jwtSecret ?? "test-secret",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
  }

  return cached;
}

export function validateRuntimeEnvOrExit() {
  const required = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`❌ Missing env: ${key}`);
    }
  }

  return getEnv();
}

export function resetEnvCacheForTests() {
  cached = undefined;
}
