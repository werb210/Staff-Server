import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { pool } from "../../../db";
import { ROLES } from "../../../auth/roles";
import { seedLenderProduct } from "../../../test/helpers/lenders";
import { seedUser } from "../../../test/helpers/users";
import {
  createApplication,
  createDocument,
  upsertApplicationRequiredDocument,
} from "../applications.repo";
import { advanceProcessingStage } from "../processingStage.service";

async function createApplicationFixture(): Promise<{
  applicationId: string;
  ownerUserId: string;
}> {
  const { lenderId, productId } = await seedLenderProduct({
    category: "LOC",
    country: "US",
    requiredDocuments: [{ type: "bank_statement", required: true }],
  });
  const owner = await seedUser({
    phoneNumber: `+1415111${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
    email: `processing-stage-${randomUUID()}@example.com`,
    role: ROLES.STAFF,
  });
  const application = await createApplication({
    ownerUserId: owner.id,
    name: "Processing Stage Test",
    metadata: null,
    productType: "LOC",
    productCategory: "LOC",
    lenderId,
    lenderProductId: productId,
  });
  return { applicationId: application.id, ownerUserId: owner.id };
}

async function markRequiredDocument(params: {
  applicationId: string;
  status: "accepted" | "rejected" | "uploaded";
}): Promise<void> {
  await upsertApplicationRequiredDocument({
    applicationId: params.applicationId,
    documentCategory: "bank_statements_6_months",
    isRequired: true,
    status: params.status,
  });
}

async function setProcessingStage(applicationId: string, stage: string): Promise<void> {
  await pool.query("update applications set processing_stage = $2 where id = $1", [
    applicationId,
    stage,
  ]);
}

describe("advanceProcessingStage", () => {
  it("advances from pending to ocr_processing when OCR jobs are pending", async () => {
    const { applicationId, ownerUserId } = await createApplicationFixture();
    const document = await createDocument({
      applicationId,
      ownerUserId,
      title: "W2",
      documentType: "w2",
    });
    await pool.query(
      `insert into document_processing_jobs
       (application_id, document_id, status)
       values ($1, $2, 'pending')`,
      [applicationId, document.id]
    );
    await setProcessingStage(applicationId, "pending");

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("ocr_processing");
  });

  it("advances from ocr_processing to ocr_complete", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'ocr_processing', ocr_completed_at = now() where id = $1",
      [applicationId]
    );

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("ocr_complete");
  });

  it("advances from ocr_complete to banking_processing", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'ocr_complete', ocr_completed_at = now() where id = $1",
      [applicationId]
    );
    await pool.query(
      `insert into banking_analysis_jobs
       (application_id, status)
       values ($1, 'pending')`,
      [applicationId]
    );

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("banking_processing");
  });

  it("advances from banking_processing to banking_complete", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'banking_processing', ocr_completed_at = now(), banking_completed_at = now() where id = $1",
      [applicationId]
    );

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("banking_complete");
  });

  it("moves to documents_incomplete when a required document is rejected", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'banking_complete', ocr_completed_at = now(), banking_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "rejected" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("documents_incomplete");
  });

  it("advances from documents_incomplete to credit_summary_processing", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'documents_incomplete', ocr_completed_at = now(), banking_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "accepted" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("credit_summary_processing");
  });

  it("advances from documents_complete to credit_summary_processing", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'documents_complete', ocr_completed_at = now(), banking_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "accepted" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("credit_summary_processing");
  });

  it("advances from credit_summary_processing to ready_for_lender", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'credit_summary_processing', ocr_completed_at = now(), banking_completed_at = now(), credit_summary_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "accepted" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("ready_for_lender");
  });

  it("advances from credit_summary_complete to ready_for_lender", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'credit_summary_complete', ocr_completed_at = now(), banking_completed_at = now(), credit_summary_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "accepted" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("ready_for_lender");
  });

  it("rejects invalid transitions by leaving the stage unchanged", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'ocr_complete', ocr_completed_at = now() where id = $1",
      [applicationId]
    );

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("ocr_complete");
  });

  it("rolls back to documents_incomplete when a document is rejected after readiness", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'ready_for_lender', ocr_completed_at = now(), banking_completed_at = now(), credit_summary_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "rejected" });

    const stage = await advanceProcessingStage({ applicationId });

    expect(stage).toBe("documents_incomplete");
  });

  it("is idempotent across repeated calls", async () => {
    const { applicationId } = await createApplicationFixture();
    await pool.query(
      "update applications set processing_stage = 'documents_complete', ocr_completed_at = now(), banking_completed_at = now() where id = $1",
      [applicationId]
    );
    await markRequiredDocument({ applicationId, status: "accepted" });

    const first = await advanceProcessingStage({ applicationId });
    const second = await advanceProcessingStage({ applicationId });

    expect(first).toBe("credit_summary_processing");
    expect(second).toBe("credit_summary_processing");
  });
});
