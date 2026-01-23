import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { ensureAuditEventSchema } from "../__tests__/helpers/auditSchema";
import { otpVerifyRequest } from "../__tests__/helpers/otpAuth";

const app = buildAppWithApiRoutes();
const requestId = "lenders-list-test";
let phoneCounter = 6100;
const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function resetDb(): Promise<void> {
  await pool.query("delete from lender_products");
  await pool.query("delete from lenders");
  await pool.query("delete from idempotency_keys");
  await pool.query("delete from otp_verifications");
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

async function loginStaff(): Promise<string> {
  const phone = nextPhone();
  await createUserAccount({
    email: `lenders-list-${phone}@example.com`,
    phoneNumber: phone,
    role: ROLES.STAFF,
  });
  const login = await otpVerifyRequest(app, {
    phone,
    requestId,
    idempotencyKey: `idem-lenders-list-${phone}`,
  });
  return login.body.accessToken as string;
}

beforeAll(async () => {
  process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
  process.env.COMMIT_SHA = "test-commit";
  process.env.JWT_SECRET = "test-access-secret";
  process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
  process.env.LOGIN_LOCKOUT_MINUTES = "10";
  process.env.PASSWORD_MAX_AGE_DAYS = "30";
  process.env.NODE_ENV = "test";
  await ensureAuditEventSchema();
});

beforeEach(async () => {
  await resetDb();
  phoneCounter = 6100;
});

afterAll(async () => {
  await pool.end();
});

describe("lender list endpoints", () => {
  it("returns arrays from GET /api/lenders and /api/lender-products", async () => {
    const token = await loginStaff();

    const lendersResponse = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(lendersResponse.status).toBe(200);
    expect(Array.isArray(lendersResponse.body)).toBe(true);

    const productsResponse = await request(app)
      .get("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(productsResponse.status).toBe(200);
    expect(Array.isArray(productsResponse.body)).toBe(true);
  });
});
