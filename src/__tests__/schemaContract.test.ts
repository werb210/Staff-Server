import type { Pool } from "pg";

const trackEvent = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: jest.fn(),
  trackDependency: jest.fn(),
  trackException: jest.fn(),
  trackEvent: (telemetry: unknown) => trackEvent(telemetry),
  initializeAppInsights: jest.fn(),
}));

let pool: Pool;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";

  jest.resetModules();
  const db = await import("../db");
  const migrations = await import("../migrations");
  pool = db.pool;

  await migrations.runMigrations();
});

afterAll(async () => {
  await pool.end();
});

describe("schema contract enforcement", () => {
  it("fails startup when required columns are missing", async () => {
    await pool.query("alter table users drop column email");
    try {
      const { assertSchema } = await import("../db");
      await expect(assertSchema()).rejects.toThrow(
        "schema_mismatch_missing_columns"
      );

      const eventNames = trackEvent.mock.calls.map(
        ([telemetry]) => (telemetry as { name?: string }).name
      );
      expect(eventNames).toContain("schema_contract_violation");
    } finally {
      await pool.query("alter table users add column email text");
    }
  });
});
