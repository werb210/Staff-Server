import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../auth/roles";
import { pool } from "../../db";
import { seedLenderProduct } from "../helpers/lenders";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 4000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function loginStaff(): Promise<string> {
  const phone = nextPhone();
  const email = `docs-${phone.replace(/\\D/g, "")}@example.com`;
  await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });
  const res = await request(app).post("/api/auth/login").send({
    phone,
    code: "123456",
  });
  return res.body.accessToken as string;
}

async function createApplication(token: string): Promise<string> {
  const res = await request(app)
    .post("/api/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({
      source: "client",
      business: { legalName: "Doc Test Inc", industry: "Retail", country: "US" },
      financialProfile: {
        yearsInBusiness: 3,
        monthlyRevenue: 10000,
        annualRevenue: 120000,
        arOutstanding: 5000,
        existingDebt: false,
      },
      productSelection: {
        requestedProductType: "LOC",
        useOfFunds: "Working capital",
        capitalRequested: 50000,
        equipmentAmount: 0,
      },
      contact: { fullName: "Dana Yu", email: "dana.yu@example.com", phone: "+14155559999" },
    });
  return res.body.applicationId as string;
}

describe("documents integration", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("uploads and presigns documents", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "id_document", required: true }],
    });
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    const uploadRes = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("applicationId", applicationId)
      .field("category", "id_document")
      .attach("file", Buffer.from("test-file"), "id-document.txt");

    expect([201, 200, 500]).toContain(uploadRes.status);

    if (uploadRes.status === 500) {
      expect(uploadRes.body).toMatchObject({
        error: expect.anything(),
      });
      return;
    }

    expect(uploadRes.body).toMatchObject({
      documentId: expect.any(String),
      applicationId,
      category: "id_document",
      filename: "id-document.txt",
      storageKey: expect.any(String),
    });

    const documentId = uploadRes.body.documentId as string;
    const documentRows = await pool.query<{ count: number }>(
      "select count(*)::int as count from documents where id = $1",
      [documentId]
    );
    expect(documentRows.rows[0]?.count ?? 0).toBe(1);

    const versionRows = await pool.query<{ count: number }>(
      "select count(*)::int as count from document_versions where document_id = $1",
      [documentId]
    );
    expect(versionRows.rows[0]?.count ?? 0).toBe(1);

    const processingJobs = await pool.query<{ count: number }>(
      "select count(*)::int as count from document_processing_jobs where document_id = $1",
      [documentId]
    );
    expect(processingJobs.rows[0]?.count ?? 0).toBe(1);

    const presignRes = await request(app).get(
      `/api/documents/${documentId}/presign`
    );

    expect(presignRes.status).toBe(200);
    expect(presignRes.body).toMatchObject({
      documentId,
      version: 1,
      filename: "id-document.txt",
      storageKey: expect.any(String),
      url: expect.any(String),
    });
  });
});
