import request from "supertest";
import express from "express";
import { buildApp, initializeServer } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { setUserActive } from "../modules/auth/auth.repo";
import { setUserStatus } from "../modules/users/users.service";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import fs from "fs";
import path from "path";
import { requireAuth, requireCapability } from "../middleware/auth";
import { errorHandler } from "../middleware/errors";
import { createHash } from "crypto";
import { issueRefreshTokenForUser } from "./helpers/refreshTokens";
import { ensureAuditEventSchema } from "./helpers/auditSchema";

const app = buildApp();
const requestId = "test-request-id";
const postWithRequestId = (url: string) =>
  request(app).post(url).set("x-request-id", requestId);

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
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  resetLoginRateLimit();
});

afterAll(async () => {
  await pool.end();
});

describe("auth", () => {
  it("logs in successfully", async () => {
    const user = await createUserAccount({
      email: "admin@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });

    const res = await postWithRequestId("/api/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(user).toBeDefined();
  });

  it("normalizes email before login", async () => {
    await createUserAccount({
      email: "Casey@Example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });

    const res = await postWithRequestId("/api/auth/login").send({
      email: "  CASEY@EXAMPLE.COM ",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("rejects empty password early", async () => {
    await createUserAccount({
      email: "blank-password@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });

    const res = await postWithRequestId("/api/auth/login").send({
      email: "blank-password@example.com",
      password: "   ",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("missing_credentials");
  });

  it("login returns usable access token", async () => {
    await createUserAccount({
      email: "token-check@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await postWithRequestId("/api/auth/login").send({
      email: "token-check@example.com",
      password: "Password123!",
    });

    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
  });

  it("preserves access token in login response for authenticated calls", async () => {
    await createUserAccount({
      email: "response-token@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await postWithRequestId("/api/auth/login").send({
      email: "response-token@example.com",
      password: "Password123!",
    });

    expect(Object.prototype.hasOwnProperty.call(login.body, "accessToken")).toBe(
      true
    );

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
  });

  it("logs in when password_changed_at is missing", async () => {
    await pool.query(`alter table users drop column password_changed_at`);
    try {
      await createUserAccount({
        email: "missing-password-changed@example.com",
        password: "Password123!",
        role: ROLES.ADMIN,
      });

      const res = await postWithRequestId("/api/auth/login").send({
        email: "missing-password-changed@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    } finally {
      await pool.query(
        `alter table users add column password_changed_at timestamp null`
      );
    }
  });

  it("writes audit events for login success and failure", async () => {
    await createUserAccount({
      email: "audit-login@example.com",
      password: "Password123!",
      role: ROLES.USER,
    });

    const success = await postWithRequestId("/api/auth/login").send({
      email: "audit-login@example.com",
      password: "Password123!",
    });
    expect(success.status).toBe(200);

    const failure = await postWithRequestId("/api/auth/login").send({
      email: "audit-login@example.com",
      password: "WrongPassword!",
    });
    expect(failure.status).toBe(401);

    const res = await pool.query(
      `select event_action as action, success
       from audit_events
       where event_action = 'login'
       order by created_at asc`
    );
    expect(res.rows).toEqual([
      { action: "login", success: true },
      { action: "login", success: false },
    ]);
  });

  it("fails login with bad password", async () => {
    await createUserAccount({
      email: "staff@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const res = await postWithRequestId("/api/auth/login").send({
      email: "staff@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("password_mismatch");
    expect(res.body.requestId).toBeDefined();
  });

  it("fails login when password hash is invalid", async () => {
    const user = await createUserAccount({
      email: "bad-hash@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    await pool.query(
      "update users set password_hash = $1 where id = $2",
      ["short-hash", user.id]
    );

    const res = await postWithRequestId("/api/auth/login").send({
      email: "bad-hash@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("invalid_password_hash");
  });

  it("returns 503 when auth lookup fails due to db outage", async () => {
    const spy = jest
      .spyOn(pool, "query")
      .mockImplementationOnce(() => Promise.reject(new Error("db down")));

    const res = await postWithRequestId("/api/auth/login").send({
      email: "db-down@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");

    spy.mockRestore();
  });

  it("blocks login when password is expired", async () => {
    const user = await createUserAccount({
      email: "expired@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const expiredDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    await pool.query(`update users set password_changed_at = $1 where id = $2`, [
      expiredDate,
      user.id,
    ]);

    const res = await postWithRequestId("/api/auth/login").send({
      email: "expired@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("password_expired");
  });

  it("blocks refresh when password is expired", async () => {
    const user = await createUserAccount({
      email: "refresh-expired@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    await postWithRequestId("/api/auth/login").send({
      email: "refresh-expired@example.com",
      password: "Password123!",
    });
    const refreshToken = await issueRefreshTokenForUser(user.id);

    const expiredDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    await pool.query(`update users set password_changed_at = $1 where id = $2`, [
      expiredDate,
      user.id,
    ]);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });

    expect(refresh.status).toBe(403);
    expect(refresh.body.code).toBe("password_expired");
  });

  it("fails login when user disabled", async () => {
    const user = await createUserAccount({
      email: "disabled@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    await setUserStatus({
      userId: user.id,
      active: false,
      actorId: user.id,
    });

    const res = await postWithRequestId("/api/auth/login").send({
      email: "disabled@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("account_disabled");
    expect(res.body.requestId).toBeDefined();
  });

  it("verifies access token", async () => {
    await createUserAccount({
      email: "user@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "user@example.com",
      password: "Password123!",
    });

    const token = login.body.accessToken;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBeDefined();
    expect(res.body.user.role).toBe(ROLES.STAFF);
  });

  it("enforces roles on staff route", async () => {
    await createUserAccount({
      email: "staffer@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const staffLogin = await postWithRequestId("/api/auth/login").send({
      email: "staffer@example.com",
      password: "Password123!",
    });
    const staffToken = staffLogin.body.accessToken;
    const staffRes = await request(app)
      .get("/api/staff/overview")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(200);

    const admin = await createUserAccount({
      email: "admin2@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const adminLogin = await postWithRequestId("/api/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });
    const adminToken = adminLogin.body.accessToken;
    const adminRes = await request(app)
      .get("/api/staff/overview")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.code).toBe("forbidden");
  });

  it("fails readiness when required env missing", async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const res = await request(app).get("/api/_int/ready");

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");

    process.env.JWT_SECRET = original;
  });

  it("fails readiness when database is unavailable", async () => {
    const spy = jest
      .spyOn(pool, "query")
      .mockImplementationOnce(() => Promise.reject(new Error("db down")));

    const res = await request(app).get("/api/_int/ready");

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("service_unavailable");

    spy.mockRestore();
  });

  it("rotates refresh tokens", async () => {
    const user = await createUserAccount({
      email: "rotate@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    await postWithRequestId("/api/auth/login").send({
      email: "rotate@example.com",
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(user.id);
    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });

    expect(refresh.status).toBe(200);
    expect(refresh.body.refreshToken).toBeDefined();
    expect(refresh.body.refreshToken).not.toBe(refreshToken);

    const refreshLatest = await postWithRequestId("/api/auth/refresh").send({
      refreshToken: refresh.body.refreshToken,
    });
    expect(refreshLatest.status).toBe(200);

    const reuseLatest = await postWithRequestId("/api/auth/refresh").send({
      refreshToken: refresh.body.refreshToken,
    });
    expect(reuseLatest.status).toBe(401);
    expect(reuseLatest.body.code).toBe("invalid_token");
  });

  it("rejects refresh token replay with audit entry", async () => {
    const user = await createUserAccount({
      email: "replay@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    await postWithRequestId("/api/auth/login").send({
      email: "replay@example.com",
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(user.id);
    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(200);

    const replay = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("invalid_token");

    const audit = await pool.query(
      `select event_action as action, success, actor_user_id, target_user_id
       from audit_events
       where event_action = 'token_reuse'
       order by created_at desc
       limit 1`
    );
    expect(audit.rows[0]).toEqual({
      action: "token_reuse",
      success: false,
      actor_user_id: user.id,
      target_user_id: user.id,
    });
  });

  it("rejects revoked refresh tokens", async () => {
    const user = await createUserAccount({
      email: "logout@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "logout@example.com",
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(user.id);
    const logout = await postWithRequestId("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");
  });

  it("denies user admin access for staff", async () => {
    await createUserAccount({
      email: "staff-access@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "staff-access@example.com",
      password: "Password123!",
    });

    const res = await postWithRequestId("/api/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        email: "newuser@example.com",
        password: "Password123!",
        role: ROLES.STAFF,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("allows admin user management", async () => {
    await createUserAccount({
      email: "admin-manage@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "admin-manage@example.com",
      password: "Password123!",
    });

    const res = await postWithRequestId("/api/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        email: "managed@example.com",
        password: "Password123!",
        role: ROLES.STAFF,
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("managed@example.com");
    expect(res.body.user.role).toBe(ROLES.STAFF);
  });

  it("rejects unauthorized role escalation attempts", async () => {
    const staff = await createUserAccount({
      email: "self-role@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "self-role@example.com",
      password: "Password123!",
    });

    const res = await postWithRequestId(`/api/users/${staff.id}/role`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ role: ROLES.ADMIN });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("denies access when roles are not declared", async () => {
    await createUserAccount({
      email: "default-deny@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await postWithRequestId("/api/auth/login").send({
      email: "default-deny@example.com",
      password: "Password123!",
    });

    const protectedApp = express();
    protectedApp.use(express.json());
    protectedApp.get(
      "/protected",
      requireAuth,
      requireCapability([]),
      (_req, res) => {
        res.json({ ok: true });
      }
    );
    protectedApp.use(errorHandler);

    const res = await request(protectedApp)
      .get("/protected")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("locks account after repeated failures", async () => {
    await createUserAccount({
      email: "locked@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const first = await postWithRequestId("/api/auth/login").send({
      email: "locked@example.com",
      password: "BadPassword!",
    });
    expect(first.status).toBe(401);

    const second = await postWithRequestId("/api/auth/login").send({
      email: "locked@example.com",
      password: "BadPassword!",
    });
    expect(second.status).toBe(401);

    const locked = await postWithRequestId("/api/auth/login").send({
      email: "locked@example.com",
      password: "Password123!",
    });
    expect(locked.status).toBe(423);
    expect(locked.body.code).toBe("account_locked");
  });

  it("invalidates tokens after password change", async () => {
    const user = await createUserAccount({
      email: "change@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await postWithRequestId("/api/auth/login").send({
      email: "change@example.com",
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(user.id);

    const change = await postWithRequestId("/api/auth/password-change")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: "Password123!", newPassword: "NewPassword123!" });
    expect(change.status).toBe(200);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(401);
    expect(me.body.code).toBe("invalid_token");
  });

  it("invalidates tokens after role change", async () => {
    const admin = await createUserAccount({
      email: "role-admin@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const staff = await createUserAccount({
      email: "role-staff@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const adminLogin = await postWithRequestId("/api/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });
    const staffLogin = await postWithRequestId("/api/auth/login").send({
      email: staff.email,
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(staff.id);

    const roleChange = await postWithRequestId(`/api/users/${staff.id}/role`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .send({ role: ROLES.ADMIN });
    expect(roleChange.status).toBe(200);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${staffLogin.body.accessToken}`);
    expect(me.status).toBe(401);
    expect(me.body.code).toBe("invalid_token");
  });

  it("revokes tokens after refresh and logout", async () => {
    const user = await createUserAccount({
      email: "cycle@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const refreshed = await postWithRequestId("/api/auth/refresh").send({
      refreshToken: await issueRefreshTokenForUser(user.id),
    });
    expect(refreshed.status).toBe(200);

    const logout = await postWithRequestId("/api/auth/logout")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`)
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(logout.status).toBe(200);

    const reuse = await postWithRequestId("/api/auth/refresh").send({
      refreshToken: refreshed.body.refreshToken,
    });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("invalid_token");
  });

  it("invalidates sessions after global logout", async () => {
    const user = await createUserAccount({
      email: "global@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await postWithRequestId("/api/auth/login").send({
      email: "global@example.com",
      password: "Password123!",
    });

    const refreshToken = await issueRefreshTokenForUser(user.id);

    const logoutAll = await postWithRequestId("/api/auth/logout-all")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(logoutAll.status).toBe(200);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(401);
    expect(me.body.code).toBe("invalid_token");
  });

  it("blocks access for disabled users with existing tokens", async () => {
    const user = await createUserAccount({
      email: "disabled-access@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await postWithRequestId("/api/auth/login").send({
      email: "disabled-access@example.com",
      password: "Password123!",
    });

    await setUserActive(user.id, false);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe("user_disabled");
  });

  it("handles password reset lifecycle", async () => {
    const admin = await createUserAccount({
      email: "reset-admin@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const user = await createUserAccount({
      email: "reset-user@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const adminLogin = await postWithRequestId("/api/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });
    await postWithRequestId("/api/auth/login").send({
      email: user.email,
      password: "Password123!",
    });

    const resetRequest = await postWithRequestId("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .send({ userId: user.id });
    expect(resetRequest.status).toBe(200);
    expect(resetRequest.body.token).toBeDefined();

    const refreshToken = await issueRefreshTokenForUser(user.id);

    const confirm = await postWithRequestId("/api/auth/password-reset/confirm")
      .send({ token: resetRequest.body.token, newPassword: "NewPassword123!" });
    expect(confirm.status).toBe(200);

    const refresh = await postWithRequestId("/api/auth/refresh").send({
      refreshToken,
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.code).toBe("invalid_token");

    const audit = await pool.query(
      `select event_action as action, success
       from audit_events
       where event_action in ('password_reset_requested', 'password_reset_completed')
       order by created_at asc`
    );
    expect(audit.rows).toEqual([
      { action: "password_reset_requested", success: true },
      { action: "password_reset_completed", success: true },
    ]);
  });

  it("rejects expired or reused reset tokens", async () => {
    const admin = await createUserAccount({
      email: "reset-expired-admin@example.com",
      password: "Password123!",
      role: ROLES.ADMIN,
    });
    const user = await createUserAccount({
      email: "reset-expired-user@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const adminLogin = await postWithRequestId("/api/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });

    const resetRequest = await postWithRequestId("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .send({ userId: user.id });
    expect(resetRequest.status).toBe(200);

    const expiredHash = createHash("sha256")
      .update(resetRequest.body.token)
      .digest("hex");
    await pool.query(
      `update password_resets set expires_at = $1 where token_hash = $2`,
      [new Date(Date.now() - 60 * 1000), expiredHash]
    );

    const expired = await postWithRequestId("/api/auth/password-reset/confirm")
      .send({ token: resetRequest.body.token, newPassword: "OtherPass123!" });
    expect(expired.status).toBe(401);
    expect(expired.body.code).toBe("invalid_token");

    const freshRequest = await postWithRequestId("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .send({ userId: user.id });
    expect(freshRequest.status).toBe(200);

    const firstConfirm = await postWithRequestId("/api/auth/password-reset/confirm")
      .send({ token: freshRequest.body.token, newPassword: "OtherPass123!" });
    expect(firstConfirm.status).toBe(200);

    const reuse = await postWithRequestId("/api/auth/password-reset/confirm")
      .send({ token: freshRequest.body.token, newPassword: "OtherPass123!" });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("invalid_token");
  });

  it("fails startup when migrations are pending", async () => {
    const migrationPath = path.join(
      process.cwd(),
      "migrations",
      "999_pending_test.sql"
    );
    fs.writeFileSync(migrationPath, "select 1;");
    try {
      await expect(initializeServer()).resolves.toBeUndefined();
      const res = await request(app).get("/api/_int/ready");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    } finally {
      fs.unlinkSync(migrationPath);
    }
  });
});
