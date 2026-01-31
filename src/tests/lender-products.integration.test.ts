import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { ensureAuditEventSchema } from "../__tests__/helpers/auditSchema";
import { otpVerifyRequest } from "../__tests__/helpers/otpAuth";

const app = buildAppWithApiRoutes();
const requestId = "lender-products-integration";
let phoneCounter = 7300;
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

async function loginAdmin(): Promise<string> {
  const phone = nextPhone();
  await createUserAccount({
    email: `lender-products-admin-${phone}@example.com`,
    phoneNumber: phone,
    role: ROLES.ADMIN,
  });
  const login = await otpVerifyRequest(app, {
    phone,
    requestId,
    idempotencyKey: `idem-lender-products-admin-${phone}`,
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
  phoneCounter = 7300;
});

afterAll(async () => {
  await pool.end();
});

describe("lender products integration", () => {
  it("blocks product creation for inactive lenders", async () => {
    const token = await loginAdmin();
    const inactiveLender = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        name: "Inactive Lender",
        country: "US",
        active: false,
        submissionEmail: "submissions@inactive-lender.com",
      });

    const blocked = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        lenderId: inactiveLender.body.id,
        name: "Blocked Product",
        required_documents: [],
      });

    expect(blocked.status).toBe(409);

    const activeLender = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        name: "Active Lender",
        country: "US",
        active: true,
        submissionEmail: "submissions@active-lender.com",
      });

    const created = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        lenderId: activeLender.body.id,
        name: "Active Product",
        required_documents: [],
      });

    expect(created.status).toBe(201);
    expect(created.body.lenderId).toBe(activeLender.body.id);
  });

  it("stores variable rate min/max as P+X", async () => {
    const token = await loginAdmin();
    const lenderResponse = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        name: "Variable Lender",
        country: "US",
        submissionEmail: "submissions@variable-lender.com",
      });

    const createResponse = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        lenderId: lenderResponse.body.id,
        name: "Variable Product",
        required_documents: [],
        rate_type: "VARIABLE",
        min_rate: 2.5,
        max_rate: 4.25,
      });

    expect(createResponse.status).toBe(201);

    const rateRow = await pool.query<{
      rate_type: string | null;
      min_rate: string | null;
      max_rate: string | null;
    }>(
      "select rate_type, min_rate, max_rate from lender_products where id = $1",
      [createResponse.body.id]
    );

    expect(rateRow.rows[0]).toMatchObject({
      rate_type: "VARIABLE",
      min_rate: "P+2.5",
      max_rate: "P+4.25",
    });
  });
});
