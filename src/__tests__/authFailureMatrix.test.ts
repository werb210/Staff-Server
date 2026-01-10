import request from "supertest";
import type express from "express";
import type { Pool } from "pg";
import { ROLES } from "../auth/roles";

const trackRequest = jest.fn();
const trackDependency = jest.fn();
const trackException = jest.fn();
const trackEvent = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: (telemetry: unknown) => trackRequest(telemetry),
  trackDependency: (telemetry: unknown) => trackDependency(telemetry),
  trackException: (telemetry: unknown) => trackException(telemetry),
  trackEvent: (telemetry: unknown) => trackEvent(telemetry),
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
let idempotencyCounter = 0;
const nextIdempotencyKey = (): string => `idem-auth-failure-${idempotencyCounter++}`;

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
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

function expectRequestId(
  res: request.Response,
  requestId: string
): void {
  expect(res.headers["x-request-id"]).toBe(requestId);
  if (res.body?.requestId) {
    expect(res.body.requestId).toBe(requestId);
  }
}

function expectNoStackTrace(res: request.Response): void {
  expect(res.body?.stack).toBeUndefined();
  expect(JSON.stringify(res.body)).not.toMatch(/\n\s*at /);
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
  trackEvent.mockClear();
  idempotencyCounter = 0;
  const { clearDbTestFailureInjection, setDbTestPoolMetricsOverride } =
    await import("../db");
  clearDbTestFailureInjection();
  setDbTestPoolMetricsOverride(null);
  delete process.env.DB_TEST_SLOW_QUERY_PATTERN;
  delete process.env.DB_TEST_SLOW_QUERY_MS;
  delete process.env.DB_TEST_QUERY_TIMEOUT_MS;
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe("auth failure matrix", () => {
  it("returns 503 when db is down before user lookup", async () => {
    await createUserAccount({
      email: "down-before@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const { setDbTestFailureInjection } = await import("../db");
    setDbTestFailureInjection({
      mode: "connection_reset",
      remaining: 2,
      matchQuery: "from users",
    });

    const requestId = "matrix-db-down";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "down-before@example.com", password: loginPassword });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });

  it("returns 503 when db times out during password check", async () => {
    await createUserAccount({
      email: "timeout-password@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const { setDbTestFailureInjection } = await import("../db");
    setDbTestFailureInjection({
      mode: "connection_timeout",
      remaining: 2,
      matchQuery: "password_hash",
    });

    const requestId = "matrix-db-timeout";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "timeout-password@example.com", password: loginPassword });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });

  it("retries once when the db recovers mid-request", async () => {
    await createUserAccount({
      email: "retry-once@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const { setDbTestFailureInjection } = await import("../db");
    setDbTestFailureInjection({
      mode: "connection_reset",
      remaining: 1,
      matchQuery: "from users",
    });

    const requestId = "matrix-db-retry";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "retry-once@example.com", password: loginPassword });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.code).toBeUndefined();
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
    expect(
      trackDependency.mock.calls.some(
        ([telemetry]) => (telemetry as { success?: boolean }).success === false
      )
    ).toBe(true);
  });

  it("returns 401 for invalid password when db is healthy", async () => {
    await createUserAccount({
      email: "invalid-password@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    const requestId = "matrix-invalid";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "invalid-password@example.com", password: "bad" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });

  it("emits determinism telemetry on successful login", async () => {
    await createUserAccount({
      email: "determinism-success@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", "determinism-success")
      .send({ email: "determinism-success@example.com", password: loginPassword });

    expect(res.status).toBe(200);
    const eventNames = trackEvent.mock.calls.map(
      ([telemetry]) => (telemetry as { name?: string }).name
    );
    expect(eventNames).toContain("auth_determinism_check_passed");
  });

  it("emits telemetry for invalid password state", async () => {
    const user = await createUserAccount({
      email: "invalid-state@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    await pool.query(
      "update users set password_hash = $1 where id = $2",
      ["not-a-bcrypt-hash", user.id]
    );

    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", "invalid-state")
      .send({ email: "invalid-state@example.com", password: loginPassword });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("user_misconfigured");
    const eventNames = trackEvent.mock.calls.map(
      ([telemetry]) => (telemetry as { name?: string }).name
    );
    expect(eventNames).toContain("auth_password_hash_invalid");
  });

  it("returns 401 for invalid password when db is slow", async () => {
    await createUserAccount({
      email: "slow-db@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    process.env.DB_TEST_SLOW_QUERY_PATTERN = "from users";
    process.env.DB_TEST_SLOW_QUERY_MS = "25";

    const requestId = "matrix-slow";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "slow-db@example.com", password: "bad" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });

  it("returns 403 when password is expired and db is healthy", async () => {
    await createUserAccount({
      email: "expired-password@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const expiredAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await pool.query("update users set password_changed_at = $1 where email = $2", [
      expiredAt,
      "expired-password@example.com",
    ]);

    const requestId = "matrix-expired";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "expired-password@example.com", password: loginPassword });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("password_expired");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });

  it("returns 503 when password is expired but db is down", async () => {
    await createUserAccount({
      email: "expired-db-down@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const expiredAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await pool.query("update users set password_changed_at = $1 where email = $2", [
      expiredAt,
      "expired-db-down@example.com",
    ]);

    const { setDbTestFailureInjection } = await import("../db");
    setDbTestFailureInjection({
      mode: "connection_reset",
      remaining: 2,
      matchQuery: "password_hash",
    });

    const requestId = "matrix-expired-down";
    const res = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .set("x-request-id", requestId)
      .send({ email: "expired-db-down@example.com", password: loginPassword });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");
    expect(res.body.code).not.toBe("password_expired");
    expectRequestId(res, requestId);
    expectNoStackTrace(res);
    expect(trackDependency).toHaveBeenCalled();
  });
});
