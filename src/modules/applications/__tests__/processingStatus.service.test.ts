import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { pool } from "../../../db";
import { ROLES } from "../../../auth/roles";
import { seedLenderProduct } from "../../../test/helpers/lenders";
import { seedUser } from "../../../test/helpers/users";
import {
  createApplication,
  upsertApplicationRequiredDocument,
} from "../applications.repo";
import { getProcessingStatus } from "../applications.service";

async function createApplicationWithRequirements(params: {
  requiredDocuments: Array<{ type: string; required?: boolean }>;
}): Promise<{ applicationId: string }> {
  const { lenderId, productId } = await seedLenderProduct({
    category: "LOC",
    country: "US",
    requiredDocuments: params.requiredDocuments,
  });
  const owner = await seedUser({
    phoneNumber: `+1415555${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
    email: `processing-status-${randomUUID()}@example.com`,
    role: ROLES.STAFF,
  });
  const application = await createApplication({
    ownerUserId: owner.id,
    name: "Processing Status Test",
    metadata: null,
    productType: "LOC",
    productCategory: "LOC",
    lenderId,
    lenderProductId: productId,
  });
  return { applicationId: application.id };
}

describe("getProcessingStatus", () => {
  it("should return all flags false if none completed", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [
        { type: "bank_statement", required: true },
        { type: "id_document", required: true },
      ],
    });

    const status = await getProcessingStatus(applicationId);

    expect(status).toEqual({
      applicationId,
      status: {
        ocr: { completed: false, completedAt: null },
        banking: { completed: false, completedAt: null },
        documents: {
          required: {
            bank_statements_6_months: { status: "missing", updatedAt: null },
            government_id: { status: "missing", updatedAt: null },
          },
          allAccepted: false,
        },
        creditSummary: { completed: false, completedAt: null },
      },
    });
  });

  it("should return true for ocr when timestamp set", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const completedAt = new Date("2024-01-02T12:00:00Z");
    await pool.query(
      "update applications set ocr_completed_at = $2, processing_stage = 'ocr_complete' where id = $1",
      [applicationId, completedAt]
    );

    const status = await getProcessingStatus(applicationId);

    expect(status.status.ocr.completed).toBe(true);
    expect(status.status.ocr.completedAt).toBe(completedAt.toISOString());
  });

  it("does not infer ocr completion from timestamps alone", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const completedAt = new Date("2024-01-02T12:00:00Z");
    await pool.query(
      "update applications set ocr_completed_at = $2, processing_stage = 'pending' where id = $1",
      [applicationId, completedAt]
    );

    const status = await getProcessingStatus(applicationId);

    expect(status.status.ocr.completed).toBe(false);
    expect(status.status.ocr.completedAt).toBeNull();
  });

  it("should return true for banking when timestamp set", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const completedAt = new Date("2024-02-03T08:30:00Z");
    await pool.query(
      "update applications set banking_completed_at = $2, processing_stage = 'banking_complete' where id = $1",
      [applicationId, completedAt]
    );

    const status = await getProcessingStatus(applicationId);

    expect(status.status.banking.completed).toBe(true);
    expect(status.status.banking.completedAt).toBe(completedAt.toISOString());
  });

  it("should classify documents correctly", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [
        { type: "bank_statement", required: true },
        { type: "id_document", required: true },
        { type: "void_check", required: true },
        { type: "business_license", required: true },
      ],
    });

    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "bank_statements_6_months",
      isRequired: true,
      status: "uploaded",
    });
    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "government_id",
      isRequired: true,
      status: "accepted",
    });
    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "void_cheque",
      isRequired: true,
      status: "rejected",
    });

    const status = await getProcessingStatus(applicationId);
    const documents = status.status.documents.required;

    expect(documents.bank_statements_6_months).toEqual({
      status: "uploaded",
      updatedAt: expect.any(String),
    });
    expect(documents.government_id).toEqual({
      status: "accepted",
      updatedAt: expect.any(String),
    });
    expect(documents.void_cheque).toEqual({
      status: "rejected",
      updatedAt: expect.any(String),
    });
    expect(documents.business_license).toEqual({
      status: "missing",
      updatedAt: null,
    });
  });

  it("allAccepted true only when all required docs accepted", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [
        { type: "bank_statement", required: true },
        { type: "id_document", required: true },
      ],
    });

    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "bank_statements_6_months",
      isRequired: true,
      status: "accepted",
    });
    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "government_id",
      isRequired: true,
      status: "rejected",
    });

    const incomplete = await getProcessingStatus(applicationId);
    expect(incomplete.status.documents.allAccepted).toBe(false);

    await upsertApplicationRequiredDocument({
      applicationId,
      documentCategory: "government_id",
      isRequired: true,
      status: "accepted",
    });

    const complete = await getProcessingStatus(applicationId);
    expect(complete.status.documents.allAccepted).toBe(true);
  });

  it("creditSummary completed logic", async () => {
    const { applicationId } = await createApplicationWithRequirements({
      requiredDocuments: [{ type: "bank_statement", required: true }],
    });
    const completedAt = new Date("2024-04-05T15:45:00Z");
    await pool.query(
      "update applications set credit_summary_completed_at = $2, processing_stage = 'credit_summary_complete' where id = $1",
      [applicationId, completedAt]
    );

    const status = await getProcessingStatus(applicationId);

    expect(status.status.creditSummary.completed).toBe(true);
    expect(status.status.creditSummary.completedAt).toBe(completedAt.toISOString());
  });
});
