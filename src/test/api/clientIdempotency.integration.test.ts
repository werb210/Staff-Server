import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../db";
import { createApplication } from "../../modules/applications/applications.repo";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";
import { ROLES } from "../../auth/roles";
import { randomUUID } from "crypto";
import { seedLenderProduct } from "../helpers/lenders";
import { getClientSubmissionOwnerUserId } from "../../config";

let app: Express;

async function seedOwner(): Promise<string> {
  const phone = `+1415555${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
  const email = `owner-${phone.replace(/\\D/g, "")}@example.com`;
  const user = await seedUser({
    phoneNumber: phone,
    role: ROLES.STAFF,
    email,
  });
  return user.id;
}

async function ensureClientSubmissionOwner(): Promise<void> {
  const ownerId = getClientSubmissionOwnerUserId();
  await pool.query(
    `insert into users
     (id, email, phone_number, phone, role, status, active, is_active, disabled, phone_verified, token_version)
     values ($1, $2, $3, $3, 'STAFF', 'ACTIVE', true, true, false, true, 0)
     on conflict (id) do nothing`,
    [ownerId, `client-owner-${ownerId}@example.com`, "+14155559999"]
  );
}

function buildSubmissionPayload(params: {
  submissionKey: string;
  productType?: string;
  selectedLenderProductId?: string;
}) {
  return {
    submissionKey: params.submissionKey,
    productType: params.productType ?? "standard",
    selectedLenderProductId: params.selectedLenderProductId ?? null,
    business: {
      legalName: "Acme LLC",
      taxId: "12-3456789",
      entityType: "llc",
      address: {
        line1: "100 Market St",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US",
      },
    },
    applicant: {
      firstName: "Ava",
      lastName: "Applicant",
      email: "ava@applicant.test",
      phone: "+1-555-555-0101",
    },
    documents: [
      {
        title: "Bank Statement",
        documentType: "bank_statement",
        metadata: { fileName: "bank.pdf", mimeType: "application/pdf", size: 1234 },
        content: "base64data",
      },
    ],
  };
}

describe("client idempotency integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("replays client submissions without creating duplicates", async () => {
    await ensureClientSubmissionOwner();
    const key = `idem-client-submission-${randomUUID()}`;
    const { lenderId, productId } = await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const quickPayload = {
      business_name: "Quick Idempotent",
      requested_amount: 12000,
      lender_id: lenderId,
      product_id: productId,
    };
    const first = await request(app)
      .post("/api/client/submissions")
      .set("Idempotency-Key", key)
      .send(quickPayload);
    const second = await request(app)
      .post("/api/client/submissions")
      .set("Idempotency-Key", key)
      .send(quickPayload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);

    const count = await pool.query<{ count: number }>(
      "select count(*)::int as count from applications"
    );
    expect(count.rows[0]?.count ?? 0).toBe(1);
  });

  it("allows distinct idempotency keys to create new submissions", async () => {
    await ensureClientSubmissionOwner();
    const { productId } = await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const first = await request(app)
      .post("/api/client/submissions")
      .set("Idempotency-Key", `idem-client-${randomUUID()}`)
      .send(
        buildSubmissionPayload({
          submissionKey: `submission-${randomUUID()}`,
          productType: "LOC",
          selectedLenderProductId: productId,
        })
      );
    const second = await request(app)
      .post("/api/client/submissions")
      .set("Idempotency-Key", `idem-client-${randomUUID()}`)
      .send(
        buildSubmissionPayload({
          submissionKey: `submission-${randomUUID()}`,
          productType: "LOC",
          selectedLenderProductId: productId,
        })
      );

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const count = await pool.query<{ count: number }>(
      "select count(*)::int as count from applications"
    );
    expect(count.rows[0]?.count ?? 0).toBe(2);
  });

  it("evicts expired idempotency keys", async () => {
    await ensureClientSubmissionOwner();
    const key = `idem-expired-${randomUUID()}`;
    await pool.query(
      `insert into idempotency_keys
       (id, key, route, request_hash, response_code, response_body, created_at)
       values ($1, $2, $3, $4, 200, '{}'::jsonb, now() - interval '2 days')`,
      [randomUUID(), key, "/client/submissions", "expired-hash"]
    );

    const { productId } = await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const res = await request(app)
      .post("/api/client/submissions")
      .set("Idempotency-Key", key)
      .send(
        buildSubmissionPayload({
          submissionKey: `submission-${randomUUID()}`,
          productType: "LOC",
          selectedLenderProductId: productId,
        })
      );

    expect(res.status).toBe(201);
    const records = await pool.query<{ count: number }>(
      "select count(*)::int as count from idempotency_keys where key = $1 and route = $2",
      [key, "/client/submissions"]
    );
    expect(records.rows[0]?.count ?? 0).toBe(1);
  });

  it("replays client document uploads without duplicate documents", async () => {
    await ensureClientSubmissionOwner();
    const ownerId = await seedOwner();
    const { lenderId, productId } = await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const application = await createApplication({
      ownerUserId: ownerId,
      name: "Client Docs App",
      metadata: { country: "US" },
      productType: "LOC",
      lenderId,
      lenderProductId: productId,
    });
    const key = `idem-client-doc-${randomUUID()}`;

    const first = await request(app)
      .post("/api/client/documents")
      .set("Idempotency-Key", key)
      .field("applicationId", application.id)
      .field("category", "bank_statements_6_months")
      .attach("file", Buffer.from("file-data"), "bank.pdf");
    const second = await request(app)
      .post("/api/client/documents")
      .set("Idempotency-Key", key)
      .field("applicationId", application.id)
      .field("category", "bank_statements_6_months")
      .attach("file", Buffer.from("file-data"), "bank.pdf");

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const docs = await pool.query<{ count: number }>(
      "select count(*)::int as count from documents where application_id = $1",
      [application.id]
    );
    expect(docs.rows[0]?.count ?? 0).toBe(1);
  });
});
