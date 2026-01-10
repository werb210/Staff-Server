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
let ensureAuditEventSchema: () => Promise<void>;

async function ensureRefreshTokensTable(): Promise<void> {
  const refreshTokensRes = await pool.query<{ count: number }>(
    `select count(*)::int as count
     from information_schema.tables
     where table_name = 'refresh_tokens'`
  );
  if ((refreshTokensRes.rows[0]?.count ?? 0) === 0) {
    try {
      await pool.query(
        `create table refresh_tokens (
           id uuid,
           user_id uuid,
           token_hash text,
           expires_at timestamp,
           revoked_at timestamp
         )`
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return;
      }
      throw err;
    }
  }
}

beforeEach(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";

  jest.resetModules();
  const db = await import("../db");
  const migrations = await import("../migrations");
  ({ ensureAuditEventSchema } = await import("./helpers/auditSchema"));
  pool = db.pool;

  await migrations.runMigrations();
  await ensureAuditEventSchema();
  await ensureRefreshTokensTable();
});

afterEach(async () => {
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

  it("passes when required columns are present", async () => {
    const { assertSchema } = await import("../db");
    await expect(assertSchema()).resolves.toBeUndefined();
  });
});
