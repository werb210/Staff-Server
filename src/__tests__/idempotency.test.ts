import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool, setDbTestFailureInjection, clearDbTestFailureInjection } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { ensureAuditEventSchema } from "./helpers/auditSchema";

const app = buildAppWithApiRoutes();
const requestId = "test-request-id";
let idempotencyCounter = 0;
const nextIdempotencyKey = (): string => `idem-test-${idempotencyCounter++}`;

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

async function loginUser(email: string): Promise<string> {
  await createUserAccount({
    email,
    password: "Password123!",
    role: ROLES.USER,
  });
  const login = await request(app)
    .post("/api/auth/login")
    .set("Idempotency-Key", nextIdempotencyKey())
    .set("x-request-id", requestId)
    .send({ email, password: "Password123!" });
  return login.body.accessToken as string;
}

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
  process.env.COMMIT_SHA = "test-commit";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
  process.env.LOGIN_LOCKOUT_MINUTES = "10";
  process.env.PASSWORD_MAX_AGE_DAYS = "30";
  process.env.NODE_ENV = "test";
  await runMigrations();
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  clearDbTestFailureInjection();
  idempotencyCounter = 0;
});

afterAll(async () => {
  await pool.end();
});

describe("idempotency enforcement", () => {
  it("returns cached response for concurrent duplicates", async () => {
    const token = await loginUser("idem-concurrent@example.com");
    const key = "idem-concurrent-key";
    const payload = {
      name: "Concurrent App",
      metadata: { source: "web" },
      productType: "standard",
    };

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${token}`)
        .set("x-request-id", requestId)
        .set("Idempotency-Key", key)
        .send(payload),
      request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${token}`)
        .set("x-request-id", requestId)
        .set("Idempotency-Key", key)
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body).toEqual(second.body);
    const count = await pool.query("select count(*)::int as count from applications");
    expect(count.rows[0].count).toBe(1);
  });

  it("rejects reused keys with different payloads", async () => {
    const token = await loginUser("idem-conflict@example.com");
    const key = "idem-conflict-key";
    const first = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send({ name: "First App", metadata: { source: "web" }, productType: "standard" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send({ name: "Second App", metadata: { source: "web" }, productType: "standard" });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("idempotency_conflict");

    const count = await pool.query("select count(*)::int as count from applications");
    expect(count.rows[0].count).toBe(1);
  });

  it("persists a single row after a retry following a db timeout", async () => {
    const token = await loginUser("idem-timeout@example.com");
    const key = "idem-timeout-key";
    setDbTestFailureInjection({
      mode: "connection_timeout",
      remaining: 1,
      matchQuery: "insert into applications",
    });

    const first = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send({ name: "Timeout App", metadata: { source: "web" }, productType: "standard" });
    expect(first.status).toBe(503);

    const second = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send({ name: "Timeout App", metadata: { source: "web" }, productType: "standard" });
    expect(second.status).toBe(201);

    const count = await pool.query("select count(*)::int as count from applications");
    expect(count.rows[0].count).toBe(1);
  });

  it("returns cached response after process restart", async () => {
    const token = await loginUser("idem-restart@example.com");
    const key = "idem-restart-key";
    const payload = { name: "Restart App", metadata: { source: "web" }, productType: "standard" };

    const first = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send(payload);
    expect(first.status).toBe(201);

    const restartedApp = buildAppWithApiRoutes();
    const second = await request(restartedApp)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send(payload);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
  });

  it("keeps data consistent when a restart occurs mid-request", async () => {
    const token = await loginUser("idem-mid-request@example.com");
    const key = "idem-mid-request-key";
    const payload = {
      name: "Mid Request App",
      metadata: { source: "web" },
      productType: "standard",
    };

    process.env.DB_TEST_SLOW_QUERY_PATTERN = "insert into applications";
    process.env.DB_TEST_SLOW_QUERY_MS = "80";

    const firstRequest = request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send(payload);

    const restartedApp = buildAppWithApiRoutes();
    const secondRequest = request(restartedApp)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .set("Idempotency-Key", key)
      .send(payload);

    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const count = await pool.query("select count(*)::int as count from applications");
    expect(count.rows[0].count).toBe(1);

    delete process.env.DB_TEST_SLOW_QUERY_PATTERN;
    delete process.env.DB_TEST_SLOW_QUERY_MS;
  });

  it("rejects missing idempotency keys", async () => {
    const token = await loginUser("idem-missing@example.com");
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({ name: "Missing Key", metadata: { source: "web" }, productType: "standard" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("missing_idempotency_key");
  });
});
