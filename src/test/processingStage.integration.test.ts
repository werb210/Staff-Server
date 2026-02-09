import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { pool } from "../db";
import { ROLES } from "../auth/roles";
import { seedLenderProduct } from "./helpers/lenders";
import { seedUser } from "./helpers/users";
import { createApplication } from "../modules/applications/applications.repo";
import {
  acceptDocumentVersion,
  markCreditSummaryCompleted,
  uploadDocument,
} from "../modules/applications/applications.service";
import {
  markBankingAnalysisCompleted,
  markDocumentProcessingCompleted,
} from "../modules/processing/processing.service";

async function createApplicationFixture(): Promise<{
  applicationId: string;
  actorUserId: string;
}> {
  const { lenderId, productId } = await seedLenderProduct({
    category: "LOC",
    country: "US",
    requiredDocuments: [
      { type: "bank_statement", required: true },
      { type: "id_document", required: true },
    ],
  });
  const owner = await seedUser({
    phoneNumber: `+1415777${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
    email: `processing-int-${randomUUID()}@example.com`,
    role: ROLES.STAFF,
  });
  const application = await createApplication({
    ownerUserId: owner.id,
    name: "Processing Stage Integration",
    metadata: null,
    productType: "LOC",
    productCategory: "LOC",
    lenderId,
    lenderProductId: productId,
  });
  return { applicationId: application.id, actorUserId: owner.id };
}

async function uploadTestDocument(params: {
  applicationId: string;
  actorUserId: string;
  documentType: string;
  title: string;
}): Promise<{ documentId: string; versionId: string }> {
  const result = await uploadDocument({
    applicationId: params.applicationId,
    title: params.title,
    documentType: params.documentType,
    metadata: {
      fileName: `${params.documentType}.pdf`,
      mimeType: "application/pdf",
      size: 1200,
    },
    content: "base64",
    actorUserId: params.actorUserId,
    actorRole: ROLES.STAFF,
  });
  return { documentId: result.value.documentId, versionId: result.value.versionId };
}

async function getProcessingStage(applicationId: string): Promise<string> {
  const res = await pool.query<{ processing_stage: string }>(
    "select processing_stage from applications where id = $1",
    [applicationId]
  );
  return res.rows[0]?.processing_stage ?? "";
}

describe("processing stage integration", () => {
  it("runs a full lifecycle to ready_for_lender", async () => {
    const { applicationId, actorUserId } = await createApplicationFixture();

    const idDoc = await uploadTestDocument({
      applicationId,
      actorUserId,
      documentType: "id_document",
      title: "ID",
    });

    for (let i = 0; i < 6; i += 1) {
      await uploadTestDocument({
        applicationId,
        actorUserId,
        documentType: "bank_statement",
        title: `Statement ${i + 1}`,
      });
    }

    await markDocumentProcessingCompleted(applicationId);
    await markBankingAnalysisCompleted(applicationId);

    await acceptDocumentVersion({
      applicationId,
      documentId: idDoc.documentId,
      documentVersionId: idDoc.versionId,
      actorUserId,
      actorRole: ROLES.STAFF,
    });

    const bankStatement = await pool.query<{ id: string; version_id: string }>(
      `select d.id, v.id as version_id
       from documents d
       join document_versions v on v.document_id = d.id
       where d.application_id = $1 and d.document_type = 'bank_statement'
       order by v.created_at asc
       limit 1`,
      [applicationId]
    );
    const bankDoc = bankStatement.rows[0];
    expect(bankDoc).toBeTruthy();

    await acceptDocumentVersion({
      applicationId,
      documentId: bankDoc.id,
      documentVersionId: bankDoc.version_id,
      actorUserId,
      actorRole: ROLES.STAFF,
    });

    await markCreditSummaryCompleted({ applicationId });

    const stage = await getProcessingStage(applicationId);
    expect(stage).toBe("ready_for_lender");
  });

  it("stops at ocr_complete for partial flows", async () => {
    const { applicationId, actorUserId } = await createApplicationFixture();

    await uploadTestDocument({
      applicationId,
      actorUserId,
      documentType: "id_document",
      title: "ID",
    });
    await markDocumentProcessingCompleted(applicationId);

    const stage = await getProcessingStage(applicationId);
    expect(stage).toBe("ocr_complete");
  });

  it("is idempotent across retry completions", async () => {
    const { applicationId, actorUserId } = await createApplicationFixture();

    await uploadTestDocument({
      applicationId,
      actorUserId,
      documentType: "id_document",
      title: "ID",
    });

    await markDocumentProcessingCompleted(applicationId);
    await markDocumentProcessingCompleted(applicationId);

    const stage = await getProcessingStage(applicationId);
    expect(stage).toBe("ocr_complete");
  });
});
