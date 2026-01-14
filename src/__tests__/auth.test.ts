import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { issueRefreshTokenForUser } from "./helpers/refreshTokens";
import { otpVerifyRequest } from "./helpers/otpAuth";

const app = buildAppWithApiRoutes();
const requestId = "test-request-id";
let phoneCounter = 100;
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
  process.env.NODE_ENV = "test";
  await runMigrations();
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  resetLoginRateLimit();
  phoneCounter = 100;
});

afterAll(async () => {
  await pool.end();
});

describe("auth otp", () => {
  it("verifies otp and returns access tokens", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "admin@example.com",
      phoneNumber: phone,
      role: ROLES.ADMIN,
    });

    const res = await otpVerifyRequest(app, {
      phone,
      requestId,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.ok).toBe(true);
    expect(me.body.data.phone).toBe(phone);
    expect(me.body.data.role).toBe(ROLES.ADMIN);
  });

  it("verifies otp for normalized phone input", async () => {
    const storedPhone = "+1 (587) 888-1837";
    const normalizedPhone = "+15878881837";
    await createUserAccount({
      email: "formatted-phone@example.com",
      phoneNumber: storedPhone,
      role: ROLES.ADMIN,
    });

    const res = await otpVerifyRequest(app, {
      phone: normalizedPhone,
      requestId,
    });

    expect(res.status).toBe(200);
  });

  it("returns 404 for otp verification when phone is unknown", async () => {
    const res = await otpVerifyRequest(app, {
      phone: "+19999999999",
      requestId,
    });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("user_not_found");
  });

  it("persists refresh token metadata on otp verification", async () => {
    const phone = nextPhone();
    const user = await createUserAccount({
      email: "token-check@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const res = await otpVerifyRequest(app, {
      phone,
      requestId,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeTruthy();

    const stored = await pool.query(
      `select user_id as "userId",
              token_hash as "tokenHash",
              expires_at as "expiresAt",
              revoked_at as "revokedAt",
              created_at as "createdAt"
       from auth_refresh_tokens
       where user_id = $1`,
      [user.id]
    );
    expect(stored.rows).toHaveLength(1);
    const record = stored.rows[0];
    expect(record.userId).toBe(user.id);
    expect(record.tokenHash).toBeTruthy();
    expect(record.expiresAt).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.revokedAt).toBeNull();
  });

  it("rejects otp verification when code is invalid", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "bad-code@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const res = await otpVerifyRequest(app, {
      phone,
      code: "000000",
      requestId,
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: "invalid_code",
      message: "Invalid or expired code",
    });
  });

  it("blocks otp verification for disabled users", async () => {
    const phone = nextPhone();
    const user = await createUserAccount({
      email: "disabled@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });
    await pool.query(`update users set disabled = true where id = $1`, [user.id]);

    const res = await otpVerifyRequest(app, {
      phone,
      requestId,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("account_disabled");
  });

  it("refreshes and revokes sessions on logout", async () => {
    const phone = nextPhone();
    const user = await createUserAccount({
      email: "cycle@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const login = await otpVerifyRequest(app, { phone, requestId });
    expect(login.status).toBe(200);

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set("x-request-id", requestId)
      .send({ refreshToken: login.body.data.refreshToken });
    expect(refreshed.status).toBe(200);

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`)
      .set("x-request-id", requestId)
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(logout.status).toBe(200);

    const reuse = await request(app)
      .post("/api/auth/refresh")
      .set("x-request-id", requestId)
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("invalid_token");

    const token = await issueRefreshTokenForUser(user.id);
    const freshLogin = await otpVerifyRequest(app, { phone, requestId });
    expect(freshLogin.status).toBe(200);

    const logoutAll = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${freshLogin.body.data.accessToken}`)
      .set("x-request-id", requestId)
      .send({});
    expect(logoutAll.status).toBe(200);

    const refreshAfterLogoutAll = await request(app)
      .post("/api/auth/refresh")
      .set("x-request-id", requestId)
      .send({ refreshToken: token });
    expect(refreshAfterLogoutAll.status).toBe(401);
    expect(refreshAfterLogoutAll.body.code).toBe("invalid_token");
  });
});
