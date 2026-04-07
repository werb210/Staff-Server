export function assertEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isTestEnv =
    nodeEnv !== "production" ||
    process.env.VITEST === "true" ||
    process.env.CI === "true";

  if (isTestEnv) {
    process.env.JWT_SECRET ||= "test-secret";
    process.env.OPENAI_API_KEY ||= "test-key";
    process.env.PORT ||= "3000";
    return;
  }

  const required = ["JWT_SECRET", "PORT", "OPENAI_API_KEY"];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing env var: ${key}`);
    }
  }
}
