import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES, type Role } from "../../auth/roles";
import { pool } from "../../db";
import { seedLenderProduct } from "../helpers/lenders";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 6000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function loginWithRole(role: Role): Promise<string> {
  const phone = nextPhone();
  const email = `workflow-${phone.replace(/\D/g, "")}@example.com`;
  await seedUser({
    phoneNumber: phone,
    role,
    lenderId: null,
    email,
  });

  const res = await request(app).post("/api/auth/login").send({
    phone,
    code: "123456",
  });

  return res.body.accessToken as string;
}

async function createApplication(token: string): Promise<string> {
  const response = await request(app)
    .post("/api/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({
      source: "client",
      country: "US",
      productCategory: "LOC",
      business: { legalName: "Workflow Test Co" },
      applicant: {
        firstName: "Drew",
        lastName: "Lee",
        email: "drew.lee@example.com",
      },
      financialProfile: { revenue: 150000 },
      match: { partner: "direct" },
    });

  return response.body.applicationId as string;
}

async function uploadDocument(params: {
  token: string;
  applicationId: string;
  documentType: string;
  title: string;
}): Promise<string> {
  const response = await request(app)
    .post(`/api/applications/${params.applicationId}/documents`)
    .set("Authorization", `Bearer ${params.token}`)
    .send({
      title: params.title,
      documentType: params.documentType,
      metadata: { fileName: `${params.documentType}.pdf`, mimeType: "application/pdf", size: 123 },
      content: "base64data",
    });

  expect(response.status).toBe(201);
  return response.body.document.documentId as string;
}

describe("document workflow", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("does not advance the pipeline stage on upload", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const token = await loginWithRole(ROLES.STAFF);
    const applicationId = await createApplication(token);

    const before = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    await uploadDocument({
      token,
      applicationId,
      documentType: "bank_statement",
      title: "Bank Statement",
    });

    const after = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    expect(after.rows[0]?.pipeline_state).toBe(before.rows[0]?.pipeline_state);
  });

  it("logs a stage event when rejecting documents", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const token = await loginWithRole(ROLES.STAFF);
    const applicationId = await createApplication(token);
    const documentId = await uploadDocument({
      token,
      applicationId,
      documentType: "bank_statement",
      title: "Bank Statement",
    });

    const rejectRes = await request(app)
      .post(`/api/documents/${documentId}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Illegible scan" });
    expect(rejectRes.status).toBe(200);

    const events = await pool.query<{ trigger: string; to_stage: string }>(
      `select trigger, to_stage
       from application_stage_events
       where application_id = $1
         and trigger = 'document_rejected'`,
      [applicationId]
    );
    expect(events.rows.length).toBeGreaterThan(0);
    expect(events.rows[0]?.to_stage).toBe("DOCUMENTS_REQUIRED");
  });

  it("does not auto-advance when all required documents are accepted", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [
        { type: "bank_statement", required: true },
        { type: "id_document", required: true },
      ],
    });
    const token = await loginWithRole(ROLES.STAFF);
    const applicationId = await createApplication(token);

    const bankId = await uploadDocument({
      token,
      applicationId,
      documentType: "bank_statement",
      title: "Bank Statement",
    });
    const idId = await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "ID Document",
    });

    const before = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    await request(app)
      .post(`/api/documents/${bankId}/accept`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .post(`/api/documents/${idId}/accept`)
      .set("Authorization", `Bearer ${token}`);

    const after = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    expect(after.rows[0]?.pipeline_state).toBe(before.rows[0]?.pipeline_state);
  });

  it("exposes required vs optional document requirements", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [
        { type: "bank_statement", required: true },
        { type: "id_document", required: false },
      ],
    });
    const token = await loginWithRole(ROLES.STAFF);
    const applicationId = await createApplication(token);

    const listRes = await request(app)
      .get(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);

    const documents = listRes.body.documents as Array<{
      documentCategory: string;
      isRequired: boolean;
    }>;
    const requiredEntry = documents.find((doc) => doc.documentCategory === "bank_statements_6_months");
    const optionalEntry = documents.find((doc) => doc.documentCategory === "government_id");

    expect(requiredEntry?.isRequired).toBe(true);
    expect(optionalEntry?.isRequired).toBe(false);
  });

  it("enforces staff-only access for accept/reject", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const staffToken = await loginWithRole(ROLES.STAFF);
    const referrerToken = await loginWithRole(ROLES.REFERRER);
    const applicationId = await createApplication(staffToken);
    const documentId = await uploadDocument({
      token: staffToken,
      applicationId,
      documentType: "bank_statement",
      title: "Bank Statement",
    });

    const rejectRes = await request(app)
      .post(`/api/documents/${documentId}/reject`)
      .set("Authorization", `Bearer ${referrerToken}`)
      .send({ reason: "Unauthorized" });
    expect(rejectRes.status).toBe(403);
  });
});
