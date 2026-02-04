import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../auth/roles";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 2000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

describe("auth integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("logs in via /api/auth/login and persists refresh token", async () => {
    const phone = nextPhone();
    const email = `auth-${phone.replace(/\\D/g, "")}@example.com`;
    await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });

    const res = await request(app).post("/api/auth/login").send({
      phone,
      code: "123456",
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        id: expect.any(String),
        role: ROLES.STAFF,
      },
    });
    expect(res.body.user.email).toBe(email.toLowerCase());

    const tokenRows = await pool.query<{ count: number }>(
      "select count(*)::int as count from auth_refresh_tokens where user_id = $1",
      [res.body.user.id]
    );
    expect(tokenRows.rows[0]?.count ?? 0).toBeGreaterThan(0);
  });

  it("refreshes tokens via /api/auth/refresh", async () => {
    const phone = nextPhone();
    const email = `auth-${phone.replace(/\\D/g, "")}@example.com`;
    await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });

    const login = await request(app).post("/api/auth/login").send({
      phone,
      code: "123456",
    });

    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: login.body.refreshToken,
    });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      ok: false,
      error: { code: "auth_failed" },
    });
  });
});
