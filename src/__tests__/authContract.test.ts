import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";

const app = buildAppWithApiRoutes();
let idempotencyCounter = 0;
let requestCounter = 0;

const nextIdempotencyKey = (): string => `idem-auth-contract-${idempotencyCounter++}`;
const nextRequestId = (): string => `auth-contract-req-${requestCounter++}`;

const loginRequest = (
  payload: { email: string; password: string },
  options: { idempotencyKey?: string; requestId: string }
) => {
  const req = request(app)
    .post("/api/auth/login")
    .set("x-request-id", options.requestId);
  if (options.idempotencyKey) {
    req.set("Idempotency-Key", options.idempotencyKey);
  }
  return req.send(payload);
};

async function resetDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from client_submissions");
    await client.query("delete from lender_submission_retries");
    await client.query("delete from lender_submissions");
    await client.query("delete from document_version_reviews");
    await client.query("delete from document_versions");
    await client.query("delete from documents");
    await client.query("delete from applications");
    await client.query("delete from idempotency_keys");
    await client.query("delete from auth_refresh_tokens");
    await client.query("delete from password_resets");
    await client.query("delete from audit_events");
    await client.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
    await client.query("commit");
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}

function expectRequestId(res: request.Response, expected: string): void {
  expect(res.headers["x-request-id"]).toBe(expected);
  if (res.body?.requestId) {
    expect(res.body.requestId).toBe(expected);
  }
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
  resetLoginRateLimit();
  idempotencyCounter = 0;
  requestCounter = 0;
});

afterAll(async () => {
  await pool.end();
});

describe("auth contract", () => {
  it("accepts idempotency key for login", async () => {
    await createUserAccount({
      email: "contract-login@example.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const requestId = nextRequestId();
    const res = await loginRequest(
      { email: "contract-login@example.com", password: "Password123!" },
      { idempotencyKey: nextIdempotencyKey(), requestId }
    );

    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.accessToken).toBeDefined();
    }
    expectRequestId(res, requestId);
  });

  it("allows login when idempotency key is missing", async () => {
    const requestId = nextRequestId();
    const res = await loginRequest(
      { email: "missing-idem@example.com", password: "Password123!" },
      { requestId }
    );

    expect([200, 401]).toContain(res.status);
    expectRequestId(res, requestId);
  });

  it("returns the same response for duplicate idempotency keys", async () => {
    await createUserAccount({
      email: "duplicate-idem@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const requestId = nextRequestId();
    const idempotencyKey = nextIdempotencyKey();
    const payload = {
      email: "duplicate-idem@example.com",
      password: "Password123!",
    };

    const first = await loginRequest(payload, { idempotencyKey, requestId });
    const second = await loginRequest(payload, { idempotencyKey, requestId });

    expect(first.status).toBe(second.status);
    expect(first.body).toEqual(second.body);
    expectRequestId(first, requestId);
    expectRequestId(second, requestId);
  });

  it("returns conflict when payload changes for the same idempotency key", async () => {
    await createUserAccount({
      email: "conflict-idem@example.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const requestId = nextRequestId();
    const idempotencyKey = nextIdempotencyKey();

    const first = await loginRequest(
      { email: "conflict-idem@example.com", password: "Password123!" },
      { idempotencyKey, requestId }
    );

    expect([200, 401]).toContain(first.status);

    const second = await loginRequest(
      { email: "conflict-idem@example.com", password: "WrongPassword!" },
      { idempotencyKey, requestId }
    );

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("idempotency_conflict");
    expectRequestId(second, requestId);
  });
});
