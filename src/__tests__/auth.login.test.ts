import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { setUserStatus } from "../modules/users/users.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { issueRefreshTokenForUser } from "./helpers/refreshTokens";

const app = buildAppWithApiRoutes();

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
});

afterAll(async () => {
  await pool.end();
});

describe("auth login regression", () => {
  it("allows login without idempotency key", async () => {
    await createUserAccount({
      email: "login-no-idem@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "login-no-idem@example.com",
      password: "Password123!",
    });

    expect([200, 401]).toContain(res.status);
    expect(res.status).not.toBe(400);
  });

  it("returns invalid_credentials on bad password", async () => {
    await createUserAccount({
      email: "bad-password@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "bad-password@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
  });

  it("returns account_disabled when the user is disabled", async () => {
    const user = await createUserAccount({
      email: "disabled-login@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    await setUserStatus({ userId: user.id, active: false, actorId: user.id });

    const res = await request(app).post("/api/auth/login").send({
      email: "disabled-login@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("account_disabled");
  });

  it("returns password_expired when the password is expired", async () => {
    await createUserAccount({
      email: "expired-login@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const expiredAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await pool.query("update users set password_changed_at = $1 where email = $2", [
      expiredAt,
      "expired-login@example.com",
    ]);

    const res = await request(app).post("/api/auth/login").send({
      email: "expired-login@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("password_expired");
  });

  it("serves CORS preflight for login", async () => {
    const res = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://staff.boreal.financial")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Authorization, Content-Type, Idempotency-Key");

    expect(res.status).toBe(204);
  });

  it("bypasses idempotency storage for auth routes", async () => {
    const user = await createUserAccount({
      email: "idem-auth@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app)
      .post("/api/auth/login")
      .set("Idempotency-Key", "idem-auth-login")
      .send({
        email: "idem-auth@example.com",
        password: "Password123!",
      });

    expect(login.status).toBe(200);
    const afterLogin = await pool.query<{ count: number }>(
      "select count(*)::int as count from idempotency_keys"
    );
    expect(afterLogin.rows[0]?.count ?? 0).toBe(0);

    const refreshToken = await issueRefreshTokenForUser(user.id);
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("Idempotency-Key", "idem-auth-logout")
      .send({ refreshToken });

    expect(logout.status).toBe(200);
    const afterLogout = await pool.query<{ count: number }>(
      "select count(*)::int as count from idempotency_keys"
    );
    expect(afterLogout.rows[0]?.count ?? 0).toBe(0);
  });

  it("returns /api/auth/me for valid JWTs", async () => {
    await createUserAccount({
      email: "me-login@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "me-login@example.com",
      password: "Password123!",
    });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.id).toBeDefined();
    expect(me.body.email).toBe("me-login@example.com");
    expect(me.body.role).toBe(ROLES.ADMIN);
    expect(Array.isArray(me.body.permissions)).toBe(true);
  });
});
