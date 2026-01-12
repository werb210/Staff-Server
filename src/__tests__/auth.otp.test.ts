import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { getTwilioMocks } from "./helpers/twilioMocks";

const app = buildAppWithApiRoutes();
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
});

afterAll(async () => {
  await pool.end();
});

describe("auth otp", () => {
  it("starts otp verification with Twilio Verify", async () => {
    const { createVerification, services } = getTwilioMocks();
    createVerification.mockClear();
    services.mockClear();
    const phone = "+14155550123";
    const res = await postWithRequestId("/api/auth/otp/start").send({ phone });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "sent" });
    expect(createVerification).toHaveBeenCalledWith({ to: phone, channel: "sms" });
    expect(services).toHaveBeenCalledWith(process.env.TWILIO_VERIFY_SERVICE_SID);
  });

  it("verifies otp code and returns tokens", async () => {
    const { createVerificationCheck, services } = getTwilioMocks();
    createVerificationCheck.mockClear();
    services.mockClear();
    const res = await postWithRequestId("/api/auth/otp/verify").send({
      phone: "+14155550123",
      code: "123456",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(createVerificationCheck).toHaveBeenCalledWith({
      to: "+14155550123",
      code: "123456",
    });
    expect(services).toHaveBeenCalledWith(process.env.TWILIO_VERIFY_SERVICE_SID);
  });
});
