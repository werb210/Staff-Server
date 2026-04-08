export type EnvSnapshot = Record<string, string | undefined>;
export type EnvOverrides = Record<string, string | undefined | null>;

export function captureOriginalEnv(): EnvSnapshot {
  return { ...process.env };
}

export function restoreEnv(originalEnv: EnvSnapshot): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

export function applyEnv(overrides: EnvOverrides): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

export function unsetEnv(keys: string[]): void {
  for (const key of keys) {
    delete process.env[key];
  }
}

export function loadTestEnv(overrides: EnvOverrides = {}): void {
  applyEnv({
    NODE_ENV: "test",
    CI: "true",
    PORT: "3001",
    JWT_SECRET: "test-secret",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    OPENAI_API_KEY: "test-key",
    ...overrides,
  });
}
