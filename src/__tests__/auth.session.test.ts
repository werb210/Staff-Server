import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { otpVerifyRequest } from "./helpers/otpAuth";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";

const app = buildAppWithApiRoutes();
let phoneCounter = 500;
const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

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
  await pool.query(
    "delete from users where id <> '00000000-0000-0000-0000-000000000001'"
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
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  resetLoginRateLimit();
  phoneCounter = 500;
});

afterAll(async () => {
  await pool.end();
});

describe("auth session bootstrap", () => {
  it("creates a session after otp verification and sets cookies", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "session@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const verify = await otpVerifyRequest(app, { phone });
    expect(verify.status).toBe(200);

    const res = await request(app).post("/api/auth/session").send({ phone });
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(500);
    expect(res.body).toEqual({ ok: true });

    const rawCookies = res.headers["set-cookie"] ?? [];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
    const accessCookie = cookies.find((cookie: string) =>
      cookie.startsWith("accessToken=")
    );
    const refreshCookie = cookies.find((cookie: string) =>
      cookie.startsWith("refreshToken=")
    );
    expect(accessCookie).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
    expect(accessCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("HttpOnly");
  });

  it("returns 401 when otp verification is missing", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "no-otp@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const res = await request(app).post("/api/auth/session").send({ phone });
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toEqual({
      code: "otp_not_verified",
      message: "OTP verification required.",
    });
  });
});
