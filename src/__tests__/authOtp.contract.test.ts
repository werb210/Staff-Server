import jwt from "jsonwebtoken";
import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { ROLES, type Role } from "../auth/roles";
import { createUserAccount } from "../modules/auth/auth.service";
import { runMigrations } from "../migrations";
import { resetLoginRateLimit } from "../middleware/rateLimit";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { otpVerifyRequest } from "./helpers/otpAuth";
import { getTwilioMocks } from "./helpers/twilioMocks";
import * as authRepo from "../modules/auth/auth.repo";

const app = buildAppWithApiRoutes();
let phoneCounter = 300;
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
  phoneCounter = 300;
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
    });

    const findUser = jest
      .spyOn(authRepo, "findAuthUserByPhone")
      .mockResolvedValueOnce({
        id: "user-1",
        email: null,
        phoneNumber: phone,
        phoneVerified: true,
        role: null as unknown as Role,
        active: true,
        tokenVersion: 0,
      });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
    expect(res.body.message).toBe("User has no assigned role");
    findUser.mockRestore();
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
    });

    const res = await otpVerifyRequest(app, { phone });
    expect(res.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.role).toBe(ROLES.STAFF);
  });
});
