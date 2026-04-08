import { validateEnv } from "../../system/env";

describe("system/env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.assign(process.env, {
      ...originalEnv,
      JWT_SECRET: "test-secret",
    });
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it("uses default PORT when PORT is missing", () => {
    Object.assign(process.env, {
      ...originalEnv,
      JWT_SECRET: "secret",
      DB_URL: "postgres://localhost:5432/test",
      PORT: undefined,
    });

    expect(() => validateEnv()).not.toThrow();
  });

  it("does not throw when JWT_SECRET is missing in test environment", () => {
    Object.assign(process.env, {
      ...originalEnv,
      NODE_ENV: "test",
      PORT: String(Date.now()),
      JWT_SECRET: undefined,
      DB_URL: "postgres://localhost:5432/test",
    });

    expect(() => validateEnv()).not.toThrow();
  });
});
