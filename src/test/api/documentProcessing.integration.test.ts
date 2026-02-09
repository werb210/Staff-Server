import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../auth/roles";
import { pool } from "../../db";
import {
  markBankingCompleted,
  markBankingFailed,
  markOcrCompleted,
  markOcrFailed,
} from "../../modules/documentProcessing/documentProcessing.service";
import { seedLenderProduct } from "../helpers/lenders";
import { createTestApp } from "../helpers/testApp";
import { seedUser } from "../helpers/users";

let app: Express;
let phoneCounter = 7000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function loginStaff(): Promise<string> {
  const phone = nextPhone();
  const email = `processing-${phone.replace(/\\D/g, "")}@example.com`;
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
      country: "US",
      productCategory: "LOC",
      business: { legalName: "Processing Test Co" },
      applicant: {
        firstName: "Pat",
        lastName: "Doe",
        email: "pat.doe@example.com",
      },
      financialProfile: { revenue: 210000 },
      match: { partner: "direct" },
    });
  return res.body.applicationId as string;
}

async function uploadDocument(params: {
  token: string;
  applicationId: string;
  documentType: string;
  title: string;
  fileName: string;
}): Promise<string> {
  const res = await request(app)
    .post(`/api/applications/${params.applicationId}/documents`)
    .set("Authorization", `Bearer ${params.token}`)
    .send({
      title: params.title,
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

describe("document processing triggers", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("creates OCR jobs for non-bank documents", async () => {
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
      `select status
       from document_processing_jobs
       where document_id = $1 and job_type = 'ocr'`,
      [documentId]
    );
    expect(jobs.rows.length).toBe(1);
    expect(jobs.rows[0]?.status).toBe("pending");
  });

  it("does not start banking analysis with fewer than six statements", async () => {
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

    const jobs = await pool.query<{ count: number }>(
      "select count(*)::int as count from banking_analysis_jobs where application_id = $1",
      [applicationId]
    );
    expect(jobs.rows[0]?.count ?? 0).toBe(0);
  });

  it("starts banking analysis when six statements are uploaded", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    const jobs = await pool.query<{ status: string }>(
      "select status from banking_analysis_jobs where application_id = $1",
      [applicationId]
    );
    expect(jobs.rows.length).toBe(1);
    expect(jobs.rows[0]?.status).toBe("pending");
  });

  it("records completion timestamps on applications", async () => {
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

    await markOcrCompleted(documentId);

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    await markBankingCompleted({ applicationId, monthsDetected: 6 });

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

  it("persists error state when jobs fail", async () => {
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

    await markOcrFailed({
      documentId,
      errorMessage: "ocr_failure",
    });

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }

    await markBankingFailed({
      applicationId,
      errorMessage: "banking_failure",
    });

    const ocrJob = await pool.query<{ status: string; error_message: string | null }>(
      "select status, error_message from document_processing_jobs where document_id = $1",
      [documentId]
    );
    expect(ocrJob.rows[0]?.status).toBe("failed");
    expect(ocrJob.rows[0]?.error_message).toBe("ocr_failure");

    const bankingJob = await pool.query<{ status: string; error_message: string | null }>(
      "select status, error_message from banking_analysis_jobs where application_id = $1",
      [applicationId]
    );
    expect(bankingJob.rows[0]?.status).toBe("failed");
    expect(bankingJob.rows[0]?.error_message).toBe("banking_failure");
  });

  it("does not change pipeline state when processing completes", async () => {
    await seedRequirements();
    const token = await loginStaff();
    const applicationId = await createApplication(token);

    const before = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    const documentId = await uploadDocument({
      token,
      applicationId,
      documentType: "id_document",
      title: "Government ID",
      fileName: "id-document.pdf",
    });
    await markOcrCompleted(documentId);

    for (let i = 0; i < 6; i += 1) {
      await uploadDocument({
        token,
        applicationId,
        documentType: "bank_statement",
        title: `Bank Statement ${i + 1}`,
        fileName: `statement-${i + 1}.pdf`,
      });
    }
    await markBankingCompleted({ applicationId, monthsDetected: 6 });

    const after = await pool.query<{ pipeline_state: string }>(
      "select pipeline_state from applications where id = $1",
      [applicationId]
    );

    expect(after.rows[0]?.pipeline_state).toBe(before.rows[0]?.pipeline_state);
  });
});
