import request from "supertest";
import express from "express";
import { buildApp, initializeServer } from "../index";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { setUserActive } from "../modules/auth/auth.repo";
import { setUserStatus } from "../modules/users/users.service";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import fs from "fs";
import path from "path";
import { requireAuth, requireRole } from "../middleware/auth";

const app = buildApp();

async function resetDb(): Promise<void> {
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users");
}

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
  process.env.LOGIN_LOCKOUT_MINUTES = "10";
  process.env.NODE_ENV = "test";
  await runMigrations();
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

    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toEqual({
      id: user.id,
      email: "admin@example.com",
      role: ROLES.ADMIN,
    });
  });

  it("fails login with bad password", async () => {
    await createUserAccount({
      email: "staff@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "staff@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
    expect(res.body.requestId).toBeDefined();
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

    const res = await request(app).post("/api/auth/login").send({
      email: "disabled@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("user_disabled");
    expect(res.body.requestId).toBeDefined();
  });

  it("verifies access token", async () => {
    await createUserAccount({
      email: "user@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await request(app).post("/api/auth/login").send({
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
    const staffLogin = await request(app).post("/api/auth/login").send({
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
    const adminLogin = await request(app).post("/api/auth/login").send({
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

  it("rotates refresh tokens", async () => {
    await createUserAccount({
      email: "rotate@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "rotate@example.com",
      password: "Password123!",
    });

    const refreshToken = login.body.refreshToken;
    const refresh = await request(app).post("/api/auth/refresh").send({
      refreshToken,
    });

    expect(refresh.status).toBe(200);
    expect(refresh.body.refreshToken).toBeDefined();
    expect(refresh.body.refreshToken).not.toBe(refreshToken);

    const reuse = await request(app).post("/api/auth/refresh").send({
      refreshToken,
    });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("invalid_token");

    const reuseLatest = await request(app).post("/api/auth/refresh").send({
      refreshToken: refresh.body.refreshToken,
    });
    expect(reuseLatest.status).toBe(401);
    expect(reuseLatest.body.code).toBe("invalid_token");
  });

  it("rejects revoked refresh tokens", async () => {
    await createUserAccount({
      email: "logout@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "logout@example.com",
      password: "Password123!",
    });

    const refreshToken = login.body.refreshToken;
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const refresh = await request(app).post("/api/auth/refresh").send({
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
    const login = await request(app).post("/api/auth/login").send({
      email: "staff-access@example.com",
      password: "Password123!",
    });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        email: "newuser@example.com",
        password: "Password123!",
        role: ROLES.STAFF,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("denies access when roles are not declared", async () => {
    await createUserAccount({
      email: "default-deny@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "default-deny@example.com",
      password: "Password123!",
    });

    const protectedApp = express();
    protectedApp.use(express.json());
    protectedApp.get(
      "/protected",
      requireAuth,
      requireRole([]),
      (_req, res) => {
        res.json({ ok: true });
      }
    );

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

    const first = await request(app).post("/api/auth/login").send({
      email: "locked@example.com",
      password: "BadPassword!",
    });
    expect(first.status).toBe(401);

    const second = await request(app).post("/api/auth/login").send({
      email: "locked@example.com",
      password: "BadPassword!",
    });
    expect(second.status).toBe(401);

    const locked = await request(app).post("/api/auth/login").send({
      email: "locked@example.com",
      password: "Password123!",
    });
    expect(locked.status).toBe(423);
    expect(locked.body.code).toBe("account_locked");
  });

  it("invalidates tokens after password change", async () => {
    await createUserAccount({
      email: "change@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "change@example.com",
      password: "Password123!",
    });

    const change = await request(app)
      .post("/api/auth/password-change")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: "Password123!", newPassword: "NewPassword123!" });
    expect(change.status).toBe(200);

    const refresh = await request(app).post("/api/auth/refresh").send({
      refreshToken: login.body.refreshToken,
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

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: "Password123!",
    });
    const staffLogin = await request(app).post("/api/auth/login").send({
      email: staff.email,
      password: "Password123!",
    });

    const roleChange = await request(app)
      .post(`/api/users/${staff.id}/role`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .send({ role: ROLES.ADMIN });
    expect(roleChange.status).toBe(200);

    const refresh = await request(app).post("/api/auth/refresh").send({
      refreshToken: staffLogin.body.refreshToken,
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
    await createUserAccount({
      email: "cycle@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "cycle@example.com",
      password: "Password123!",
    });

    const refreshed = await request(app).post("/api/auth/refresh").send({
      refreshToken: login.body.refreshToken,
    });
    expect(refreshed.status).toBe(200);

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`)
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(logout.status).toBe(200);

    const reuse = await request(app).post("/api/auth/refresh").send({
      refreshToken: refreshed.body.refreshToken,
    });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("invalid_token");
  });

  it("invalidates sessions after global logout", async () => {
    await createUserAccount({
      email: "global@example.com",
      password: "Password123!",
      role: ROLES.STAFF,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "global@example.com",
      password: "Password123!",
    });

    const logoutAll = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(logoutAll.status).toBe(200);

    const refresh = await request(app).post("/api/auth/refresh").send({
      refreshToken: login.body.refreshToken,
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

    const login = await request(app).post("/api/auth/login").send({
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

  it("fails startup when migrations are pending", async () => {
    const migrationPath = path.join(
      process.cwd(),
      "migrations",
      "999_pending_test.sql"
    );
    fs.writeFileSync(migrationPath, "select 1;");
    try {
      await expect(initializeServer()).rejects.toThrow("pending_migrations");
    } finally {
      fs.unlinkSync(migrationPath);
    }
  });
});
