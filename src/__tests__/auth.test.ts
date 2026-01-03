import request from "supertest";
import { buildApp } from "../index";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { setUserActive } from "../modules/auth/auth.repo";
import { resetLoginRateLimit } from "../middleware/rateLimit";

const app = buildApp();

async function createSchema(): Promise<void> {
  await pool.query(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      password_hash text not null,
      role text not null,
      active boolean not null,
      password_changed_at timestamp not null
    );
  `);
  await pool.query(`
    create table if not exists auth_refresh_tokens (
      id text primary key,
      user_id text not null,
      token_hash text not null,
      expires_at timestamp not null,
      revoked_at timestamp null,
      created_at timestamp not null
    );
  `);
  await pool.query(`
    create table if not exists password_resets (
      id text primary key,
      user_id text not null,
      token_hash text not null,
      expires_at timestamp not null,
      used_at timestamp null
    );
  `);
  await pool.query(`
    create table if not exists audit_logs (
      id text primary key,
      actor_user_id text null,
      action text not null,
      entity text not null,
      entity_id text null,
      ip text null,
      success boolean not null,
      created_at timestamp not null
    );
  `);
}

async function resetDb(): Promise<void> {
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_logs");
  await pool.query("delete from users");
}

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
  process.env.NODE_ENV = "test";
  await createSchema();
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
      role: "admin",
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
      role: "admin",
    });
  });

  it("fails login with bad password", async () => {
    await createUserAccount({
      email: "staff@example.com",
      password: "Password123!",
      role: "staff",
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
      role: "staff",
    });
    await setUserActive(user.id, false);

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
      role: "staff",
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
    expect(res.body.user.role).toBe("staff");
  });

  it("enforces roles on staff route", async () => {
    await createUserAccount({
      email: "staffer@example.com",
      password: "Password123!",
      role: "staff",
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
      role: "admin",
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
      role: "staff",
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
  });

  it("rejects revoked refresh tokens", async () => {
    await createUserAccount({
      email: "logout@example.com",
      password: "Password123!",
      role: "staff",
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
      role: "staff",
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
        role: "staff",
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });
});
