import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { ROLES } from "../auth/roles";
import { pool } from "../db";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { createUserAccount } from "../modules/auth/auth.service";
import { otpVerifyRequest } from "./helpers/otpAuth";
import { getTwilioMocks } from "./helpers/twilioMocks";

describe("token lifecycle stability", () => {
  let app: ReturnType<typeof buildAppWithApiRoutes>;
  let phoneCounter = 400;

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
    await pool.query("delete from otp_verifications");
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
    await runMigrations();
    app = buildAppWithApiRoutes();
  });

  beforeEach(async () => {
    await resetDb();
    resetLoginRateLimit();
    phoneCounter = 400;
    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockReset();
    twilioMocks.createVerificationCheck.mockReset();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("allows a grace window for /api/auth/me on expired tokens", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        sub: "grace-user",
        role: ROLES.STAFF,
        exp: nowSeconds - 30,
        iat: nowSeconds - 60,
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { noTimestamp: true }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.userId).toBe("grace-user");
  });

  it("rejects expired tokens outside the grace window", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        sub: "expired-user",
        role: ROLES.STAFF,
        exp: nowSeconds - 600,
        iat: nowSeconds - 660,
      },
      process.env.JWT_SECRET ?? "test-access-secret",
      { noTimestamp: true }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("keeps refresh tokens valid after repeated OTP verify requests", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-lifecycle@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
    });

    const first = await otpVerifyRequest(app, { phone });
    expect(first.status).toBe(200);

    const twilioError: any = new Error("not found");
    twilioError.code = 20404;
    twilioError.status = 404;
    twilioMocks.createVerificationCheck.mockRejectedValueOnce(twilioError);

    const second = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone, code: "123456" });

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ ok: true, data: { alreadyVerified: true } });
    expect(twilioMocks.createVerificationCheck).toHaveBeenCalledTimes(1);

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: first.body.data.refreshToken });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
  });
});
