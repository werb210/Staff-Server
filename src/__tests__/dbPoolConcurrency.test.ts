import request from "supertest";
import type express from "express";
import type { Pool } from "pg";
import { ROLES } from "../auth/roles";

const trackRequest = jest.fn();
const trackDependency = jest.fn();
const trackException = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: (telemetry: unknown) => trackRequest(telemetry),
  trackDependency: (telemetry: unknown) => trackDependency(telemetry),
  trackException: (telemetry: unknown) => trackException(telemetry),
  initializeAppInsights: jest.fn(),
}));

type CreateUserAccount = (params: {
  email: string;
  password: string;
  role: typeof ROLES[keyof typeof ROLES];
}) => Promise<{ id: string; email: string; role: typeof ROLES[keyof typeof ROLES] }>;

let app: express.Express;
let pool: Pool;
let createUserAccount: CreateUserAccount;

const loginPassword = "Password123!";

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

async function resetDb(): Promise<void> {
  await pool.query("delete from client_submissions");
  await pool.query("delete from lender_submission_retries");
  await pool.query("delete from lender_submissions");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
  await pool.query("delete from idempotency_keys");
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> 'client-submission-system'");
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "pg-mem";
  process.env.DB_POOL_TEST_MODE = "true";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.LOGIN_LOCKOUT_THRESHOLD = "20";
  process.env.LOGIN_LOCKOUT_MINUTES = "10";
  process.env.PASSWORD_MAX_AGE_DAYS = "30";

  jest.resetModules();
  const { buildAppWithApiRoutes } = await import("../app");
  const db = await import("../db");
  const migrations = await import("../migrations");
  const authService = await import("../modules/auth/auth.service");
  const { ensureAuditEventSchema } = await import("./helpers/auditSchema");
  const { setDbConnected } = await import("../startupState");

  app = buildAppWithApiRoutes();
  pool = db.pool;
  createUserAccount = authService.createUserAccount;

  await migrations.runMigrations();
  await ensureAuditEventSchema();
  setDbConnected(true);
});

beforeEach(async () => {
  trackRequest.mockClear();
  trackDependency.mockClear();
  trackException.mockClear();
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe("db pool concurrency hardening", () => {
  it("uses the test pool override configuration", () => {
    const config = (pool as unknown as { options?: { max?: number; idleTimeoutMillis?: number } })
      .options;
    if (config?.max !== undefined) {
      expect(config.max).toBe(2);
      expect(config.idleTimeoutMillis).toBe(1000);
      return;
    }
    const { getPoolConfig } = require("../db") as typeof import("../db");
    const poolConfig = getPoolConfig();
    expect(poolConfig.max).toBe(2);
    expect(poolConfig.idleTimeoutMillis).toBe(1000);
  });

  it("handles concurrent login attempts without errors or hangs", async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        createUserAccount({
          email: `concurrent-${index}@example.com`,
          password: loginPassword,
          role: ROLES.STAFF,
        })
      )
    );
    trackRequest.mockClear();
    trackDependency.mockClear();

    const requests = [
      ...users.map((user, index) =>
        request(app)
          .post("/api/auth/login")
          .set("x-request-id", `valid-${index}`)
          .send({ email: user.email, password: loginPassword })
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post("/api/auth/login")
          .set("x-request-id", `invalid-${index}`)
          .send({ email: `invalid-${index}@example.com`, password: "bad" })
      ),
    ];

    const start = Date.now();
    const responses = await withTimeout(Promise.all(requests), 8000);
    const durationMs = Date.now() - start;

    expect(durationMs).toBeLessThan(8000);

    responses.slice(0, 10).forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    responses.slice(10).forEach((res) => {
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("invalid_credentials");
    });

    expect(responses.some((res) => res.status >= 500)).toBe(false);
    expect(trackRequest).toHaveBeenCalledTimes(20);
    expect(trackDependency.mock.calls.length).toBeGreaterThanOrEqual(20);
    expect(
      trackDependency.mock.calls.every(
        ([telemetry]) => (telemetry as { success?: boolean }).success === true
      )
    ).toBe(true);
  });

  it("returns 503 when the pool is exhausted and recovers afterward", async () => {
    await createUserAccount({
      email: "pool-exhaust@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    trackDependency.mockClear();

    process.env.DB_TEST_FORCE_POOL_EXHAUSTION = "true";
    const exhaustionRequests = [
      request(app)
        .post("/api/auth/login")
        .set("x-request-id", "exhaust-1")
        .send({ email: "pool-exhaust@example.com", password: loginPassword }),
      request(app)
        .post("/api/auth/login")
        .set("x-request-id", "exhaust-2")
        .send({ email: "pool-exhaust@example.com", password: loginPassword }),
    ];

    const responses = await withTimeout(Promise.all(exhaustionRequests), 5000);

    responses.forEach((res) => {
      expect(res.status).toBe(503);
      expect(res.body.code).toBe("service_unavailable");
    });

    expect(
      trackDependency.mock.calls.some(
        ([telemetry]) =>
          (telemetry as { success?: boolean; dependencyTypeName?: string })
            .success === false &&
          (telemetry as { dependencyTypeName?: string }).dependencyTypeName === "postgres"
      )
    ).toBe(true);

    delete process.env.DB_TEST_FORCE_POOL_EXHAUSTION;

    await new Promise((resolve) => setImmediate(resolve));

    const recovered = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", "recovered")
      .send({ email: "pool-exhaust@example.com", password: loginPassword });

    expect(recovered.status).toBe(200);
    const poolState = pool as unknown as {
      totalCount?: number;
      idleCount?: number;
      waitingCount?: number;
      options?: { max?: number };
    };
    expect(poolState.waitingCount ?? 0).toBe(0);
    expect(poolState.totalCount ?? 0).toBeLessThanOrEqual(poolState.options?.max ?? 2);
    expect(poolState.idleCount ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("times out slow queries without blocking unrelated requests", async () => {
    await createUserAccount({
      email: "slow-query@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    process.env.DB_TEST_SLOW_QUERY_PATTERN = "select";
    process.env.DB_TEST_SLOW_QUERY_MS = "40";
    process.env.DB_TEST_QUERY_TIMEOUT_MS = "20";
    trackDependency.mockClear();

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const slowLoginPromise = withTimeout(
      request(app)
        .post("/api/auth/login")
        .set("x-request-id", "slow-login")
        .send({ email: "slow-query@example.com", password: loginPassword }),
      5000
    );

    const healthStart = Date.now();
    const health = await request(app).get("/health");
    const healthDurationMs = Date.now() - healthStart;

    const slowLogin = await slowLoginPromise;

    expect(health.status).toBe(200);
    expect(healthDurationMs).toBeLessThan(500);
    expect(slowLogin.status).toBe(503);
    expect(slowLogin.body.code).toBe("service_unavailable");

    const errorEvents = errorSpy.mock.calls
      .map((call) => call[0])
      .filter(Boolean)
      .map((entry) => {
        try {
          return JSON.parse(String(entry));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    expect(
      errorEvents.some((payload) => payload.event === "auth_login_db_unavailable")
    ).toBe(true);
    expect(
      trackDependency.mock.calls.some(
        ([telemetry]) =>
          (telemetry as { success?: boolean; dependencyTypeName?: string })
            .success === false &&
          (telemetry as { dependencyTypeName?: string }).dependencyTypeName === "postgres"
      )
    ).toBe(true);

    errorSpy.mockRestore();
    delete process.env.DB_TEST_SLOW_QUERY_PATTERN;
    delete process.env.DB_TEST_SLOW_QUERY_MS;
    delete process.env.DB_TEST_QUERY_TIMEOUT_MS;
  });

  it("retries database readiness and rejects requests during retry window", async () => {
    const { waitForDatabaseReady } = await import("../db");
    const { setDbConnected } = await import("../startupState");

    process.env.DB_READY_ATTEMPTS = "2";
    process.env.DB_READY_BASE_DELAY_MS = "5";

    setDbConnected(false);

    const querySpy = jest
      .spyOn(pool, "query")
      .mockImplementationOnce(() => Promise.reject(new Error("db down")))
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const readinessPromise = waitForDatabaseReady();
    const loginPromise = request(app)
      .post("/api/auth/login")
      .set("x-request-id", "retry-window")
      .send({ email: "retry-window@example.com", password: loginPassword });

    const [loginRes] = await Promise.all([loginPromise, readinessPromise]);

    expect(loginRes.status).toBe(503);
    expect(loginRes.body.code).toBe("service_unavailable");
    expect(loginRes.body.accessToken).toBeUndefined();
    expect(querySpy).toHaveBeenCalledTimes(2);

    setDbConnected(true);
    querySpy.mockRestore();
  });
});
