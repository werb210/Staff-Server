import request from "supertest";
import { randomUUID } from "crypto";
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

async function loginAdmin(): Promise<string> {
  const phone = nextPhone();
  await createUserAccount({
    email: `lenders-admin-${phone}@example.com`,
    phoneNumber: phone,
    role: ROLES.ADMIN,
  });
  const login = await otpVerifyRequest(app, {
    phone,
    requestId,
    idempotencyKey: `idem-lenders-admin-${phone}`,
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
    const lenderId = randomUUID();
    await pool.query(
      `insert into lenders (id, name, country, submission_email, status, active)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        lenderId,
        "List Lender",
        "US",
        "submissions@list-lender.com",
        "ACTIVE",
        true,
      ]
    );
    await pool.query(
      `insert into lender_products
       (id, lender_id, lender_name, name, description, type, min_amount, max_amount, status, active, required_documents, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())`,
      [
        randomUUID(),
        lenderId,
        "List Lender",
        "List Product",
        "List product description",
        "loc",
        1000,
        2000,
        "active",
        true,
        JSON.stringify([{ type: "bank_statement", months: 6 }]),
      ]
    );

    const lendersResponse = await request(app)
      .get("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(lendersResponse.status).toBe(200);
    expect(Array.isArray(lendersResponse.body)).toBe(true);

    const productsResponse = await request(app)
      .get(`/api/lender-products?lenderId=${lenderId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(productsResponse.status).toBe(200);
    expect(Array.isArray(productsResponse.body)).toBe(true);
  });

  it("persists lender fields after update", async () => {
    const token = await loginAdmin();

    const createResponse = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", `idem-lenders-persist-${requestId}`)
      .set("x-request-id", requestId)
      .send({
        name: "Persistent Lender",
        country: "US",
        active: true,
        submissionMethod: "EMAIL",
        submissionEmail: "submissions@persistent-lender.com",
        contact: {
          name: "Pat Smith",
          email: "pat@persistent-lender.com",
          phone: "15551234567",
        },
        email: "hello@persistent-lender.com",
        phone: "15559876543",
        website: "https://persistent-lender.com",
        postal_code: "12345",
      });

    expect(createResponse.status).toBe(201);

    const updateResponse = await request(app)
      .patch(`/api/lenders/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", `idem-lenders-update-${requestId}`)
      .set("x-request-id", requestId)
      .send({
        name: "Persistent Lender Updated",
        country: "CA",
        active: false,
        submissionMethod: "API",
        apiConfig: { endpoint: "https://api.lender.test" },
        submissionEmail: "submissions@persistent-lender.ca",
        contact: {
          name: "Taylor Doe",
          email: "taylor@persistent-lender.ca",
          phone: "15557654321",
        },
        email: "hello@persistent-lender.ca",
        phone: "15550001111",
        website: "https://persistent-lender.ca",
        postal_code: "A1B2C3",
      });

    expect(updateResponse.status).toBe(200);

    const getResponse = await request(app)
      .get(`/api/lenders/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createResponse.body.id,
      name: "Persistent Lender Updated",
      country: "CA",
      status: "INACTIVE",
      active: false,
      contact_name: "Taylor Doe",
      contact_email: "taylor@persistent-lender.ca",
      contact_phone: "15557654321",
      email: "hello@persistent-lender.ca",
      phone: "15550001111",
      website: "https://persistent-lender.ca",
      postal_code: "A1B2C3",
      submission_method: "API",
      submission_email: "submissions@persistent-lender.ca",
    });
  });
});
