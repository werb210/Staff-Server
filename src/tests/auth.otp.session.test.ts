import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { getTwilioMocks } from "../__tests__/helpers/twilioMocks";
import { otpStartRequest, otpVerifyRequest } from "../__tests__/helpers/otpAuth";

const app = buildAppWithApiRoutes();

async function resetDb(): Promise<void> {
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from otp_verifications");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

describe("OTP session cookies", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("sets a session cookie after OTP verify", async () => {
    const phone = "+14155550123";
    await createUserAccount({
      email: "otp-cookie@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValueOnce({
      sid: "VE-start",
      status: "pending",
    });

    const startRes = await otpStartRequest(app, { phone });
    expect(startRes.status).toBe(200);

    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      sid: "VE-check",
      status: "approved",
    });

    const verifyRes = await otpVerifyRequest(app, { phone });

    expect(verifyRes.status).toBe(200);
    const setCookie = verifyRes.headers["set-cookie"];
    expect(setCookie).toBeTruthy();
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieHeader).toContain("staff_session=");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("Secure");
    expect(cookieHeader).toContain("SameSite=None");
    expect(cookieHeader).toContain("Domain=.boreal.financial");
    expect(cookieHeader).toContain("Path=/");
  });

  it("authenticates /api/auth/me using the session cookie", async () => {
    const phone = "+14155550124";
    await createUserAccount({
      email: "otp-cookie-me@example.com",
      phoneNumber: phone,
      role: ROLES.STAFF,
    });

    const twilioMocks = getTwilioMocks();
    twilioMocks.createVerification.mockResolvedValueOnce({
      sid: "VE-start-me",
      status: "pending",
    });
    await otpStartRequest(app, { phone });

    twilioMocks.createVerificationCheck.mockResolvedValueOnce({
      sid: "VE-check-me",
      status: "approved",
    });
    const verifyRes = await otpVerifyRequest(app, { phone });

    const setCookie = verifyRes.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieHeader).toBeTruthy();

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.ok).toBe(true);
    expect(meRes.body.data.role).toBe(ROLES.STAFF);
  });

  it("rejects /api/auth/me without a session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("missing_token");
  });
});
