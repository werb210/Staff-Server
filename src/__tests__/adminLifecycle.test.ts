import request from "supertest";
import { buildApp } from "../index";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { issueRefreshTokenForUser } from "./helpers/refreshTokens";

const app = buildApp();
const requestId = "test-request-id";

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
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe("admin lifecycle", () => {
  it("enforces admin-only access for user management", async () => {
    await createUserAccount({
      email: "staff@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: "staff@example.com",
      password: "Password123!",
    });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${staffLogin.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        email: "new@example.com",
        password: "Password123!",
        role: ROLES.USER,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("invalidates sessions on disable", async () => {
    const admin = await createUserAccount({
      email: "admin@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const user = await createUserAccount({
      email: "user@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: admin.email,
      password: "Password123!",
    });
    const userLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: user.email,
      password: "Password123!",
    });

    const disable = await request(app)
      .post(`/api/users/${user.id}/disable`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("x-request-id", requestId);
    expect(disable.status).toBe(200);

    const refresh = await request(app)
      .post("/api/auth/refresh")
      .set("x-request-id", requestId)
      .send({
      refreshToken: await issueRefreshTokenForUser(user.id),
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${userLogin.body.accessToken}`);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe("user_disabled");
  });

  it("records audit events for lifecycle actions", async () => {
    const admin = await createUserAccount({
      email: "admin-audit@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .set("x-request-id", requestId)
      .send({
      email: admin.email,
      password: "Password123!",
    });

    const created = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({
        email: "audited@example.com",
        password: "Password123!",
        role: ROLES.STAFF,
      });
    expect(created.status).toBe(201);
    const userId = created.body.user.id;

    const disable = await request(app)
      .post(`/api/users/${userId}/disable`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("x-request-id", requestId);
    expect(disable.status).toBe(200);

    const enable = await request(app)
      .post(`/api/users/${userId}/enable`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("x-request-id", requestId);
    expect(enable.status).toBe(200);

    const roleChange = await request(app)
      .post(`/api/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ role: ROLES.ADMIN });
    expect(roleChange.status).toBe(200);

    const audit = await pool.query(
      `select action
       from audit_events
       where target_user_id = $1
         and action in ('user_created', 'user_disabled', 'user_enabled', 'user_role_changed')
       order by created_at asc`,
      [userId]
    );

    expect(audit.rows.map((row) => row.action)).toEqual([
      "user_created",
      "user_disabled",
      "user_enabled",
      "user_role_changed",
    ]);
  });
});
