export function assertEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv !== "production") {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "test-key";
    process.env.PORT = process.env.PORT ?? "3000";
    return;
  }

  const required = ["JWT_SECRET", "PORT", "OPENAI_API_KEY"];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing env var: ${key}`);
    }
  }
}
