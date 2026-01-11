import request from "supertest";
import type express from "express";
import type { Pool } from "pg";
import { ROLES } from "../auth/roles";

const trackDependency = jest.fn();
const trackException = jest.fn();
const trackEvent = jest.fn();

jest.mock("../observability/appInsights", () => ({
  trackRequest: jest.fn(),
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
let issueRefreshTokenForUser: (userId: string) => Promise<string>;

const loginPassword = "Password123!";
let idempotencyCounter = 0;
const nextIdempotencyKey = (): string => `idem-auth-db-${idempotencyCounter++}`;

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

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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
  const refreshTokens = await import("./helpers/refreshTokens");
  const { setDbConnected } = await import("../startupState");

  app = buildAppWithApiRoutes();
  pool = db.pool;
  createUserAccount = authService.createUserAccount;
  issueRefreshTokenForUser = refreshTokens.issueRefreshTokenForUser;

  await migrations.runMigrations();
  await ensureAuditEventSchema();
  setDbConnected(true);
});

beforeEach(async () => {
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
  delete process.env.AUTH_DB_QUERY_TIMEOUT_MS;
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe("auth db failure hardening", () => {
  it("survives auth traffic during latency, pool exhaustion, and disconnects", async () => {
    const loginUser = await createUserAccount({
      email: "storm-login@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });
    const sessionUser = await createUserAccount({
      email: "storm-session@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ email: sessionUser.email, password: loginPassword });
    expect(loginRes.status).toBe(200);

    const refreshToken = await issueRefreshTokenForUser(sessionUser.id);

    process.env.DB_TEST_SLOW_QUERY_PATTERN = "from users";
    process.env.DB_TEST_SLOW_QUERY_MS = "10";
    process.env.AUTH_DB_QUERY_TIMEOUT_MS = "200";

    const { setDbTestFailureInjection, setDbTestPoolMetricsOverride } =
      await import("../db");
    setDbTestFailureInjection({
      mode: "connection_reset",
      remaining: 1,
      matchQuery: "from users",
    });

    const loginRequests = Array.from({ length: 10 }, () =>
      request(app)
        .post("/api/auth/login")
        .set("Idempotency-Key", nextIdempotencyKey())
        .send({ email: loginUser.email, password: loginPassword })
    );
    const refreshRequests = Array.from({ length: 25 }, () =>
      request(app)
        .post("/api/auth/refresh")
        .set("Idempotency-Key", nextIdempotencyKey())
        .send({ refreshToken })
    );
    const logoutRequests = Array.from({ length: 25 }, () =>
      request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .set("Idempotency-Key", nextIdempotencyKey())
        .send()
    );

    const firstBatch = await withTimeout(
      Promise.all([...loginRequests, ...refreshRequests, ...logoutRequests]),
      15000
    );

    for (const res of firstBatch) {
      expect([200, 401, 403, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(["service_unavailable", "auth_unavailable"]).toContain(res.body.code);
      }
      if (res.status === 401) {
        expect(["invalid_credentials", "invalid_token"]).toContain(res.body.code);
      }
    }

    setDbTestPoolMetricsOverride({
      totalCount: 2,
      idleCount: 0,
      waitingCount: 3,
      max: 2,
    });

    const poolBatch = await withTimeout(
      Promise.all([
        request(app)
          .post("/api/auth/login")
          .set("Idempotency-Key", nextIdempotencyKey())
          .send({ email: loginUser.email, password: loginPassword }),
        request(app)
          .post("/api/auth/refresh")
          .set("Idempotency-Key", nextIdempotencyKey())
          .send({ refreshToken }),
        request(app)
          .post("/api/auth/logout-all")
          .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
          .set("Idempotency-Key", nextIdempotencyKey())
          .send(),
      ]),
      10000
    );

    for (const res of poolBatch) {
      expect([500, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(res.body.code).toBe("service_unavailable");
      }
      if (res.status === 500) {
        expect(res.body.code).toBe("server_error");
      }
    }

    setDbTestPoolMetricsOverride(null);
    delete process.env.DB_TEST_SLOW_QUERY_PATTERN;
    delete process.env.DB_TEST_SLOW_QUERY_MS;
    delete process.env.AUTH_DB_QUERY_TIMEOUT_MS;

    const recoveryLogin = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ email: loginUser.email, password: loginPassword });
    expect(recoveryLogin.status).toBe(200);

    const recoveryToken = await issueRefreshTokenForUser(sessionUser.id);
    const recoveryRefresh = await request(app)
      .post("/api/auth/refresh")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ refreshToken: recoveryToken });
    expect(recoveryRefresh.status).toBe(200);

  });

  it("rejects parallel refresh attempts deterministically", async () => {
    const user = await createUserAccount({
      email: "refresh-parallel@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ email: user.email, password: loginPassword });

    const refreshToken = await issueRefreshTokenForUser(user.id);

    const refreshResponses = await withTimeout(
      Promise.all(
        Array.from({ length: 30 }, () =>
          request(app)
            .post("/api/auth/refresh")
            .set("Idempotency-Key", nextIdempotencyKey())
            .send({ refreshToken })
        )
      ),
      10000
    );

    const successCount = refreshResponses.filter((res) => res.status === 200)
      .length;
    const invalidCount = refreshResponses.filter((res) => res.status === 401)
      .length;
    expect(successCount).toBe(1);
    expect(invalidCount).toBe(29);

    const activeTokens = await pool.query(
      `select count(*)::int as count
       from auth_refresh_tokens
       where user_id = $1
         and revoked_at is null`,
      [user.id]
    );
    expect(activeTokens.rows[0]?.count).toBe(1);

    const invalidLogin = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ email: user.email, password: "bad" });
    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body.code).toBe("invalid_credentials");

    const eventNames = trackEvent.mock.calls.map(
      ([telemetry]) => (telemetry as { name?: string }).name
    );
    expect(eventNames).toContain("auth_invalid_credentials");
  });

  it("keeps logout-all atomic on db disconnects", async () => {
    const user = await createUserAccount({
      email: "logout-all-atomic@example.com",
      password: loginPassword,
      role: ROLES.STAFF,
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey())
      .send({ email: user.email, password: loginPassword });
    expect(loginRes.status).toBe(200);

    await issueRefreshTokenForUser(user.id);

    const { setDbTestFailureInjection } = await import("../db");
    setDbTestFailureInjection({
      mode: "connection_reset",
      remaining: 2,
      matchQuery: "update users set token_version",
    });

    const logoutRes = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
      .set("Idempotency-Key", nextIdempotencyKey())
      .send();
    expect(logoutRes.status).toBe(503);
    expect(logoutRes.body.code).toBe("service_unavailable");

    const tokenState = await pool.query(
      `select count(*)::int as count
       from auth_refresh_tokens
       where user_id = $1
         and revoked_at is null`,
      [user.id]
    );
    expect(tokenState.rows[0]?.count).toBe(1);
  });
});
