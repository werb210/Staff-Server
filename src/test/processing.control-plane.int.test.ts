import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../auth/roles";
import { pool } from "../db";
import {
  markBankingAnalysisCompleted,
  markBankingAnalysisFailed,
  markDocumentProcessingCompleted,
  markDocumentProcessingFailed,
} from "../modules/processing/processing.service";
import { seedLenderProduct } from "./helpers/lenders";
import { createTestApp } from "./helpers/testApp";
import { seedUser } from "./helpers/users";

let app: Express;
let phoneCounter = 8200;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function loginStaff(): Promise<string> {
  const phone = nextPhone();
  const email = `processing-${phone.replace(/\D/g, "")}@example.com`;
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
      business: { legalName: "Control Plane Co", industry: "Services", country: "US" },
      contact: { fullName: "Alex Lee", email: "alex.lee@example.com", phone: "+14155550000" },
      financialProfile: {
        yearsInBusiness: 3,
        monthlyRevenue: 10000,
        annualRevenue: 150000,
        arOutstanding: 2500,
        existingDebt: false,
      },
      productSelection: {
        requestedProductType: "LOC",
        useOfFunds: "Working capital",
        capitalRequested: 50000,
        equipmentAmount: 0,
      },
    });
  return res.body.applicationId as string;
}

async function uploadDocument(params: {
  token: string;
  applicationId: string;
  documentType: string;
  title: string;
  fileName: string;
  documentId?: string;
}): Promise<string> {
  const res = await request(app)
    .post(`/api/applications/${params.applicationId}/documents`)
    .set("Authorization", `Bearer ${params.token}`)
    .send({
      title: params.title,
      documentId: params.documentId,
      documentType: params.documentType,
      metadata: {
        fileName: params.fileName,
        mimeType: "application/pdf",
        size: 123,
      },
      content: "base64data",
    });
  expect(res.status).toBe(201);
  return res.body.document.documentId as string;
}

async function seedRequirements(): Promise<void> {
  await seedLenderProduct({
    category: "LOC",
    country: "US",
    requiredDocuments: [
      { type: "bank_statement", required: true },
      { type: "id_document", required: true },
    ],
  });
}

describe("processing control plane", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("creates OCR jobs on non-bank uploads", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    const documentId = await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document.pdf",
    });

    const jobs = await pool.query<{ status: string }>(
      `select status from document_processing_jobs
       where application_id = $1 and document_id = $2`,
      [applicationId, documentId]
    );
    expect(jobs.rows.length).toBe(1);
    expect(jobs.rows[0]?.status).toBe("pending");
  });

  it("creates banking jobs only after six statements", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    for (let i = 0; i < 5; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    const beforeJobs = await pool.query<{ count: number }>(
      "select count(*)::int as count from banking_analysis_jobs where application_id = $1",
      [applicationId]
    );
    expect(beforeJobs.rows[0]?.count ?? 0).toBe(0);

    await uploadDocument({
      token,
      applicationId,
      documentType: "bank_statement",
      title: "Bank Statement 6",
      fileName: "statement-6.pdf",
    });

    const afterJobs = await pool.query<{ count: number }>(
      "select count(*)::int as count from banking_analysis_jobs where application_id = $1",
      [applicationId]
    );
    expect(afterJobs.rows[0]?.count ?? 0).toBe(1);
  });

  it("avoids duplicate OCR jobs on re-uploads", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    const documentId = await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document.pdf",
    });

    await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document-v2.pdf",
      documentId,
    });

    const jobs = await pool.query<{ count: number }>(
      `select count(*)::int as count
       from document_processing_jobs
       where application_id = $1 and document_id = $2`,
      [applicationId, documentId]
    );
    expect(jobs.rows[0]?.count ?? 0).toBe(1);
  });

  it("sets completion timestamps when jobs complete", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document.pdf",
    });

    await markDocumentProcessingCompleted(applicationId);

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    await markBankingAnalysisCompleted(applicationId);

    const application = await pool.query<{
      ocr_completed_at: Date | null;
      banking_completed_at: Date | null;
    }>(
      "select ocr_completed_at, banking_completed_at from applications where id = $1",
      [applicationId]
    );

    expect(application.rows[0]?.ocr_completed_at).toBeTruthy();
    expect(application.rows[0]?.banking_completed_at).toBeTruthy();
  });

  it("does not set timestamps when jobs fail", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document.pdf",
    });

    await markDocumentProcessingFailed(applicationId);

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    await markBankingAnalysisFailed(applicationId);

    const application = await pool.query<{
      ocr_completed_at: Date | null;
      banking_completed_at: Date | null;
    }>(
      "select ocr_completed_at, banking_completed_at from applications where id = $1",
      [applicationId]
    );

    expect(application.rows[0]?.ocr_completed_at).toBeNull();
    expect(application.rows[0]?.banking_completed_at).toBeNull();
  });
});
