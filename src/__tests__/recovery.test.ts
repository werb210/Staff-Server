import bcrypt from "bcryptjs";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount, requestPasswordReset } from "../modules/auth/auth.service";
import { findAuthUserByEmail } from "../modules/auth/auth.repo";
import { setUserStatus } from "../modules/users/users.service";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { ensureAuditEventSchema } from "./helpers/auditSchema";

const app = buildAppWithApiRoutes();
let idempotencyCounter = 0;
const nextIdempotencyKey = (): string => `idem-recovery-${idempotencyCounter++}`;

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
  idempotencyCounter = 0;
  resetLoginRateLimit();
});

afterAll(async () => {
  await pool.end();
});

describe("recovery integration", () => {
  it("connects to the database", async () => {
    const res = await pool.query<{ result: number }>(
      "select 1 as result"
    );
    expect(res.rows[0]?.result).toBe(1);
  });

  it("looks up a user by email", async () => {
    await createUserAccount({
      email: "lookup@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const user = await findAuthUserByEmail("lookup@example.com");
    expect(user?.email).toBe("lookup@example.com");
  });

  it("verifies stored password hashes", async () => {
    await createUserAccount({
      email: "hash-check@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const user = await findAuthUserByEmail("hash-check@example.com");
    const match = await bcrypt.compare(
      "Password123!",
      user?.passwordHash ?? ""
    );
    expect(match).toBe(true);
  });

  it("logs in successfully", async () => {
    await createUserAccount({
      email: "login-success@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });

    const res = await request(app).post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey()).send({
      email: "login-success@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("returns invalid_credentials when the user does not exist", async () => {
    const res = await request(app).post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey()).send({
      email: "missing@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
  });

  it("returns invalid_credentials when the password is wrong", async () => {
    await createUserAccount({
      email: "mismatch@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const res = await request(app).post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey()).send({
      email: "mismatch@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
  });

  it("returns user_disabled when the user is disabled", async () => {
    const user = await createUserAccount({
      email: "disabled-recovery@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    await setUserStatus({
      userId: user.id,
      active: false,
      actorId: user.id,
    });

    const res = await request(app).post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey()).send({
      email: "disabled-recovery@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("user_disabled");
  });

  it("returns password_expired when a reset is pending", async () => {
    const user = await createUserAccount({
      email: "reset-required@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    await requestPasswordReset({ userId: user.id });

    const res = await request(app).post("/api/auth/login")
      .set("Idempotency-Key", nextIdempotencyKey()).send({
      email: "reset-required@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("password_expired");
  });

  it("logs requests for telemetry", async () => {
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    await request(app).get("/health");

    const hasRequestLog = logSpy.mock.calls
      .map((call) => call[0])
      .filter(Boolean)
      .map((entry) => {
        try {
          return JSON.parse(String(entry));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .some(
        (payload) =>
          payload.event === "request_started" &&
          payload.route === "/health" &&
          payload.method === "GET"
      );
    logSpy.mockRestore();

    expect(hasRequestLog).toBe(true);
  });
});
