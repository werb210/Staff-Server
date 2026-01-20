import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { ensureOtpTableExists } from "../db/ensureOtpTable";
import { randomUUID } from "crypto";
import { ROLES } from "../auth/roles";
import { createUserAccount } from "../modules/auth/auth.service";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { DEFAULT_OTP_CODE, otpVerifyRequest } from "./helpers/otpAuth";
import { getTwilioMocks } from "./helpers/twilioMocks";

const app = buildAppWithApiRoutes();
let phoneCounter = 300;
const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function resetDb(): Promise<void> {
  await ensureOtpTableExists();
  await pool.query("delete from client_submissions");
  await pool.query("delete from lender_submission_retries");
  await pool.query("delete from lender_submissions");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
  await pool.query("delete from idempotency_keys");
  try {
    await pool.query("delete from otp_verifications");
  } catch {
  }
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

beforeAll(async () => {
  process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
  process.env.COMMIT_SHA = "test-commit";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.NODE_ENV = "test";
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  resetLoginRateLimit();
  phoneCounter = 300;
  const twilioMocks = getTwilioMocks();
  twilioMocks.createVerification.mockReset();
  twilioMocks.createVerificationCheck.mockReset();
  twilioMocks.createVerification.mockImplementation(async () => ({
    sid: "VE123",
    status: "pending",
  }));
  twilioMocks.createVerificationCheck.mockImplementation(async (params) => ({
    status: params.code === DEFAULT_OTP_CODE ? "approved" : "pending",
    sid: "VE-CHECK-DEFAULT",
  }));
});

afterAll(async () => {
  await pool.end();
});

describe("auth otp contract", () => {
  it("issues a JWT with role on OTP verify", async () => {
    const phone = nextPhone();
    const user = await createUserAccount({
      email: "otp-role@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-001",
    });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(200);

    const payload = jwt.verify(
      res.body.accessToken,
      process.env.JWT_SECRET ?? "test-access-secret"
    ) as jwt.JwtPayload;

    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe(ROLES.STAFF);
  });

  it("rejects OTP verify when user role is missing", async () => {
    const phone = nextPhone();
    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-002",
    });

    delete process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.AUTH_BOOTSTRAP_ADMIN_PHONE;
    await pool.query(
      `insert into users (id, email, phone_number, role, active)
       values ($1, $2, $3, $4, $5)`,
      [randomUUID(), "otp-null@example.com", phone, null, true]
    );

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
    expect(res.body.error.message).toBe("User has no assigned role");
  });

  it("returns role in /api/auth/me after OTP login", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-me@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-003",
    });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.ok).toBe(true);
    expect(me.body.data.role).toBe(ROLES.STAFF);
  });

  it("returns 200 on repeated OTP verify without calling Twilio", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-repeat@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-004",
    });

    const first = await otpVerifyRequest(app, { phone });
    expect(first.status).toBe(200);

    const twilioError: any = new Error("not found");
    twilioError.code = 20404;
    twilioError.status = 404;
    twilioMocks.createVerificationCheck.mockRejectedValueOnce(twilioError);

    const second = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone, code: DEFAULT_OTP_CODE });

    expect(second.status).toBe(200);
    expect(second.body.accessToken).toBeTruthy();
    expect(second.body.user).toMatchObject({
      role: ROLES.STAFF,
      email: "otp-repeat@example.com",
    });
    expect(twilioMocks.createVerificationCheck).toHaveBeenCalledTimes(1);
  });

  it("returns a stable error contract on invalid OTP code", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-invalid-code@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const requestId = "otp-invalid-request";
    const res = await otpVerifyRequest(app, {
      phone,
      code: "000000",
      requestId,
    });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toEqual({
      code: "invalid_code",
      message: "Invalid or expired code",
    });
    expect(res.body.requestId).toBe(requestId);
  });

  it("verifies OTP when otp_verifications table is missing", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-missing-table@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    await pool.query("drop table if exists otp_verifications cascade");

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-006",
    });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({
      role: ROLES.STAFF,
      email: "otp-missing-table@example.com",
    });
  });

  it("uses the Verify check endpoint with the configured service SID", async () => {
    const phone = nextPhone();
    await createUserAccount({
      email: "otp-service-sid@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      status: "approved",
      sid: "VE-CHECK-007",
    });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(200);
    expect(twilioMocks.createVerificationCheck).toHaveBeenCalledTimes(1);
    expect(twilioMocks.lastServiceSid).toBe(
      process.env.TWILIO_VERIFY_SERVICE_SID
    );
  });
});
