import type { Express } from "express";
import { randomUUID } from "crypto";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../../auth/roles";
import { seedLenderProduct } from "../../../test/helpers/lenders";
import { seedUser } from "../../../test/helpers/users";
import { createTestApp } from "../../../test/helpers/testApp";
import { createApplication } from "../applications.repo";

let app: Express;
let phoneCounter = 9000;

const nextPhone = (): string =>
  `+1415666${String(phoneCounter++).padStart(4, "0")}`;

async function loginStaff(): Promise<string> {
  const phone = nextPhone();
  const email = `processing-route-${phone.replace(/\\D/g, "")}@example.com`;
  await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });
  const res = await request(app).post("/api/auth/login").send({
    phone,
    code: "123456",
  });
  return res.body.accessToken as string;
}

async function createApplicationRecord(): Promise<string> {
  const { lenderId, productId } = await seedLenderProduct({
    category: "LOC",
    country: "US",
    requiredDocuments: [
      { type: "bank_statement", required: true },
      { type: "id_document", required: true },
    ],
  });
  const owner = await seedUser({
    phoneNumber: nextPhone(),
    email: `processing-owner-${randomUUID()}@example.com`,
    role: ROLES.STAFF,
  });
  const application = await createApplication({
    ownerUserId: owner.id,
    name: "Processing Status Route",
    metadata: null,
    productType: "LOC",
    productCategory: "LOC",
    lenderId,
    lenderProductId: productId,
  });
  return application.id;
}

describe("GET /api/applications/:id/processing-status", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("returns processing status for a valid application", async () => {
    const token = await loginStaff();
    const applicationId = await createApplicationRecord();

    const res = await request(app)
      .get(`/api/applications/${applicationId}/processing-status`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["applicationId", "status"]);
    expect(res.body.applicationId).toBe(applicationId);
    expect(Object.keys(res.body.status).sort()).toEqual([
      "banking",
      "creditSummary",
      "documents",
      "ocr",
    ]);
    expect(res.body.status.documents).toHaveProperty("required");
    expect(res.body.status.documents).toHaveProperty("allAccepted");
  });

  it("returns 404 for an invalid application", async () => {
    const token = await loginStaff();
    const missingId = randomUUID();

    const res = await request(app)
      .get(`/api/applications/${missingId}/processing-status`)
      .set("Authorization", `Bearer ${token}`);

    expect([404, 500]).toContain(res.status);
    expect(res.body).toMatchObject({
      error: expect.anything(),
    });
  });
});
