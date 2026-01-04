import { AppError } from "../../middleware/errors";
import { pool } from "../../db";
import { createApplication, createDocument, createDocumentVersion } from "../applications/applications.repo";
import { recordAuditEvent } from "../audit/audit.service";
import {
  getAllowedDocumentTypes,
  getDocumentCategory,
  getRequirements,
  isSupportedProductType,
} from "../applications/documentRequirements";
import { getDocumentAllowedMimeTypes, getDocumentMaxSizeBytes, getClientSubmissionOwnerUserId } from "../../config";
import { createClientSubmission, findClientSubmissionByKey } from "./clientSubmission.repo";

export type ClientSubmissionResponse = {
  applicationId: string;
  pipelineState: string;
};

type SubmissionDocument = {
  title: string;
  documentType: string;
  metadata: {
    fileName: string;
    mimeType: string;
    size: number;
  };
  content: string;
};

type ClientSubmissionPayload = {
  submissionKey: string;
  productType: string;
  business: {
    legalName: string;
    taxId: string;
    entityType: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  documents: SubmissionDocument[];
};

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("invalid_payload", `${label} is required.`, 400);
  }
}

function assertExactKeys(
  record: Record<string, unknown>,
  keys: string[],
  label: string
): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new AppError("invalid_payload", `${label} has invalid fields.`, 400);
  }
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("invalid_payload", `${label} is required.`, 400);
  }
  return value;
}

function assertDocuments(value: unknown): SubmissionDocument[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError("invalid_payload", "documents are required.", 400);
  }
  return value.map((entry, index) => {
    assertObject(entry, `documents[${index}]`);
    assertExactKeys(entry, ["title", "documentType", "metadata", "content"], `documents[${index}]`);
    const title = assertString(entry.title, `documents[${index}].title`);
    const documentType = assertString(entry.documentType, `documents[${index}].documentType`);
    const content = assertString(entry.content, `documents[${index}].content`);
    assertObject(entry.metadata, `documents[${index}].metadata`);
    assertExactKeys(
      entry.metadata,
      ["fileName", "mimeType", "size"],
      `documents[${index}].metadata`
    );
    const fileName = assertString(entry.metadata.fileName, `documents[${index}].metadata.fileName`);
    const mimeType = assertString(entry.metadata.mimeType, `documents[${index}].metadata.mimeType`);
    const sizeValue = entry.metadata.size;
    if (typeof sizeValue !== "number" || Number.isNaN(sizeValue) || sizeValue <= 0) {
      throw new AppError("invalid_payload", `documents[${index}].metadata.size is invalid.`, 400);
    }
    return {
      title,
      documentType,
      content,
      metadata: {
        fileName,
        mimeType,
        size: sizeValue,
      },
    };
  });
}

function assertPayload(payload: unknown): ClientSubmissionPayload {
  assertObject(payload, "payload");
  assertExactKeys(payload, ["submissionKey", "productType", "business", "applicant", "documents"], "payload");
  const submissionKey = assertString(payload.submissionKey, "submissionKey");
  const productType = assertString(payload.productType, "productType");
  assertObject(payload.business, "business");
  assertExactKeys(
    payload.business,
    ["legalName", "taxId", "entityType", "address"],
    "business"
  );
  const legalName = assertString(payload.business.legalName, "business.legalName");
  const taxId = assertString(payload.business.taxId, "business.taxId");
  const entityType = assertString(payload.business.entityType, "business.entityType");
  assertObject(payload.business.address, "business.address");
  assertExactKeys(
    payload.business.address,
    ["line1", "city", "state", "postalCode", "country"],
    "business.address"
  );
  const address = {
    line1: assertString(payload.business.address.line1, "business.address.line1"),
    city: assertString(payload.business.address.city, "business.address.city"),
    state: assertString(payload.business.address.state, "business.address.state"),
    postalCode: assertString(payload.business.address.postalCode, "business.address.postalCode"),
    country: assertString(payload.business.address.country, "business.address.country"),
  };
  assertObject(payload.applicant, "applicant");
  assertExactKeys(payload.applicant, ["firstName", "lastName", "email", "phone"], "applicant");
  const applicant = {
    firstName: assertString(payload.applicant.firstName, "applicant.firstName"),
    lastName: assertString(payload.applicant.lastName, "applicant.lastName"),
    email: assertString(payload.applicant.email, "applicant.email"),
    phone: assertString(payload.applicant.phone, "applicant.phone"),
  };
  const documents = assertDocuments(payload.documents);

  return {
    submissionKey,
    productType,
    business: {
      legalName,
      taxId,
      entityType,
      address,
    },
    applicant,
    documents,
  };
}

function enforceDocumentRules(productType: string, documents: SubmissionDocument[]): void {
  if (!isSupportedProductType(productType)) {
    throw new AppError("invalid_product", "Unsupported product type.", 400);
  }
  const requirements = getRequirements({ productType, pipelineState: "NEW" });
  const allowedTypes = new Set(getAllowedDocumentTypes(productType));
  const counts = new Map<string, number>();
  documents.forEach((doc) => {
    if (!allowedTypes.has(doc.documentType)) {
      throw new AppError("invalid_document_type", "Document type is not allowed.", 400);
    }
    if (!getDocumentCategory(productType, doc.documentType)) {
      throw new AppError("invalid_document_type", "Document type is not mapped.", 400);
    }
    counts.set(doc.documentType, (counts.get(doc.documentType) ?? 0) + 1);
  });

  for (const requirement of requirements) {
    const count = counts.get(requirement.documentType) ?? 0;
    if (requirement.required && count === 0) {
      throw new AppError("missing_documents", "Required documents are missing.", 400);
    }
    if (!requirement.multipleAllowed && count > 1) {
      throw new AppError(
        "document_duplicate",
        "Multiple documents are not allowed for this type.",
        400
      );
    }
  }
}

function enforceDocumentMetadata(documents: SubmissionDocument[]): void {
  const allowed = getDocumentAllowedMimeTypes();
  const maxSize = getDocumentMaxSizeBytes();
  for (const doc of documents) {
    if (!allowed.includes(doc.metadata.mimeType)) {
      throw new AppError("invalid_mime_type", "Unsupported document MIME type.", 400);
    }
    if (doc.metadata.size > maxSize) {
      throw new AppError("document_too_large", "Document exceeds max size.", 400);
    }
  }
}

export async function submitClientApplication(params: {
  payload: unknown;
  ip?: string;
  userAgent?: string;
}): Promise<{ status: number; value: ClientSubmissionResponse; idempotent: boolean }> {
  const submission = assertPayload(params.payload);
  enforceDocumentRules(submission.productType, submission.documents);
  enforceDocumentMetadata(submission.documents);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await findClientSubmissionByKey(submission.submissionKey, client);
    if (existing) {
      await recordAuditEvent({
        action: "client_submission_retried",
        actorUserId: null,
        targetUserId: null,
        targetType: "application",
        targetId: existing.application_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client,
      });
      await client.query("commit");
      return {
        status: 200,
        value: { applicationId: existing.application_id, pipelineState: "NEW" },
        idempotent: true,
      };
    }

    const ownerUserId = getClientSubmissionOwnerUserId();
    const application = await createApplication({
      ownerUserId,
      name: submission.business.legalName,
      metadata: {
        submissionKey: submission.submissionKey,
        business: submission.business,
        applicant: submission.applicant,
      },
      productType: submission.productType,
      client,
    });

    for (const doc of submission.documents) {
      const document = await createDocument({
        applicationId: application.id,
        ownerUserId,
        title: doc.title,
        documentType: doc.documentType,
        client,
      });
      await createDocumentVersion({
        documentId: document.id,
        version: 1,
        metadata: doc.metadata,
        content: doc.content,
        client,
      });

      await recordAuditEvent({
        action: "document_uploaded",
        actorUserId: null,
        targetUserId: ownerUserId,
        targetType: "document",
        targetId: document.id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client,
      });
    }

    await createClientSubmission({
      submissionKey: submission.submissionKey,
      applicationId: application.id,
      payload: submission,
      client,
    });

    await recordAuditEvent({
      action: "client_submission_created",
      actorUserId: null,
      targetUserId: ownerUserId,
      targetType: "application",
      targetId: application.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    await client.query("commit");
    return {
      status: 201,
      value: { applicationId: application.id, pipelineState: application.pipeline_state },
      idempotent: false,
    };
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "client_submission_failed",
      actorUserId: null,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}
