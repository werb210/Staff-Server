import request from "supertest";
import { randomUUID } from "crypto";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { otpVerifyRequest } from "./helpers/otpAuth";

const app = buildAppWithApiRoutes();

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

async function insertUser(params: {
  phoneNumber: string;
  phone?: string | null;
  active?: boolean;
  lockedUntil?: Date | null;
}): Promise<void> {
  await pool.query(
    `insert into users (id, email, phone_number, phone, role, active, locked_until)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      randomUUID(),
      `otp-${randomUUID()}@example.com`,
      params.phoneNumber,
      params.phone ?? null,
      ROLES.STAFF,
      params.active ?? true,
      params.lockedUntil ?? null,
    ]
  );
}

beforeAll(async () => {
  process.env.DATABASE_URL = "pg-mem";
  process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
  process.env.COMMIT_SHA = "test-commit";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "1d";
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

describe("API auth JSON responses", () => {
  it("returns JSON for /api/auth/start", async () => {
    const res = await request(app)
      .post("/api/auth/start")
      .send({ phone: "+15878881337" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.success || res.body.error).toBeTruthy();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("returns JSON error for /api/auth/verify with invalid code", async () => {
    const res = await request(app)
      .post("/api/auth/verify")
      .send({ phone: "+15878881337", code: "000000" });

    expect([400, 401]).toContain(res.status);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error).toBeDefined();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("allows OTP verify when user exists via phone column", async () => {
    const phoneNumber = "+14155550001";
    const phone = "+14155550002";
    await insertUser({ phoneNumber, phone });

    const res = await otpVerifyRequest(app, { phone });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("allows OTP verify when user exists via phone_number column", async () => {
    const phone = "+14155550003";
    await insertUser({ phoneNumber: phone, phone: null });

    const res = await otpVerifyRequest(app, { phone });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("rejects OTP verify when disabled = true", async () => {
    const phone = "+14155550004";
    await insertUser({ phoneNumber: phone, active: false });

    const res = await otpVerifyRequest(app, { phone });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("account_disabled");
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });

  it("rejects OTP verify when locked_until is in the future", async () => {
    const phone = "+14155550005";
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    await insertUser({ phoneNumber: phone, lockedUntil });

    const res = await otpVerifyRequest(app, { phone });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("account_disabled");
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.text).not.toMatch(/<!doctype|<html/i);
  });
});
