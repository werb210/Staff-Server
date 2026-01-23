import request from "supertest";
import { buildAppWithApiRoutes } from "../app";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { ensureAuditEventSchema } from "./helpers/auditSchema";
import { otpVerifyRequest } from "./helpers/otpAuth";

const app = buildAppWithApiRoutes();
const requestId = "test-request-id";
let phoneCounter = 3300;
const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function resetDb(): Promise<void> {
  await pool.query("delete from lender_products");
  await pool.query("delete from lenders");
  await pool.query("delete from idempotency_keys");
  await pool.query("delete from otp_verifications");
  await pool.query("delete from auth_refresh_tokens");
  await pool.query("delete from password_resets");
  await pool.query("delete from audit_events");
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

async function loginAdmin(): Promise<string> {
  const phone = nextPhone();
  await createUserAccount({
    email: `lender-products-${phone}@example.com`,
    phoneNumber: phone,
    role: ROLES.ADMIN,
  });
  const login = await otpVerifyRequest(app, {
    phone,
    requestId,
    idempotencyKey: `idem-lender-products-${phone}`,
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
  phoneCounter = 3300;
});

afterAll(async () => {
  await pool.end();
});

describe("lender products", () => {
  it("creates, lists, and updates required documents", async () => {
    const token = await loginAdmin();
    const lenderResponse = await request(app)
      .post("/api/lenders")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({ name: "Docs Lender", country: "US" });

    const requiredDocuments = [
      { type: "bank_statement" },
      { type: "id_document" },
    ];

    const createResponse = await request(app)
      .post("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({
        lenderId: lenderResponse.body.id,
        name: "Documented Product",
        required_documents: requiredDocuments,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.required_documents).toEqual(requiredDocuments);

    const listResponse = await request(app)
      .get("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    expect(listResponse.status).toBe(200);
    const listed = listResponse.body.find(
      (item: { id: string }) => item.id === createResponse.body.id
    );
    expect(listed).toBeDefined();
    expect(listed.required_documents).toEqual(requiredDocuments);

    const updatedDocuments = [
      { type: "tax_return" },
      { type: "balance_sheet" },
    ];

    const patchResponse = await request(app)
      .patch(`/api/lender-products/${createResponse.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId)
      .send({ required_documents: updatedDocuments });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.required_documents).toEqual(updatedDocuments);

    const listAfterPatch = await request(app)
      .get("/api/lender-products")
      .set("Authorization", `Bearer ${token}`)
      .set("x-request-id", requestId);

    const patched = listAfterPatch.body.find(
      (item: { id: string }) => item.id === createResponse.body.id
    );
    expect(patched.required_documents).toEqual(updatedDocuments);
  });
});
