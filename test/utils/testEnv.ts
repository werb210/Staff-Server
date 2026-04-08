export function loadTestEnv(overrides: Record<string, string> = {}) {
  const base = {
    NODE_ENV: "test",
    CI: "true",
    PORT: "3001",
    JWT_SECRET: "test-secret",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    OPENAI_API_KEY: "test-key",
  };

  const merged = { ...base, ...overrides };

  // DO NOT mutate original env object directly if frozen
  const newEnv = { ...process.env };

  for (const [key, value] of Object.entries(merged)) {
    newEnv[key] = value;
  }

  // replace env reference safely
  Object.assign(process.env, newEnv);
}
