import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import {
  createApplication,
  createDocument,
  createDocumentVersion,
  createDocumentVersionReview,
  findApplicationById,
  findDocumentById,
  findDocumentByApplicationAndType,
  findAcceptedDocumentVersion,
  findDocumentVersionById,
  findDocumentVersionReview,
  findLatestDocumentVersionStatus,
  getLatestDocumentVersion,
  updateApplicationPipelineState,
} from "./applications.repo";
import { pool } from "../../db";
import { type Role, ROLES } from "../../auth/roles";
import { type PoolClient } from "pg";
import { createIdempotencyRecord, findIdempotencyRecord } from "../idempotency/idempotency.repo";
import { getDocumentCategory, getRequirements, isSupportedProductType } from "./documentRequirements";
import {
  PIPELINE_STATES,
  canTransition,
  isPipelineState,
  type PipelineState,
} from "./pipelineState";
import { getDocumentAllowedMimeTypes, getDocumentMaxSizeBytes } from "../../config";

const IDEMPOTENCY_SCOPE_APPLICATION = "application_create";
const IDEMPOTENCY_SCOPE_DOCUMENT = "document_upload";

export type ApplicationResponse = {
  id: string;
  ownerUserId: string;
  name: string;
  metadata: unknown | null;
  productType: string;
  pipelineState: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentUploadResponse = {
  documentId: string;
  versionId: string;
  version: number;
};

type MetadataPayload = {
  fileName: string;
  mimeType: string;
  size: number;
};

type IdempotentResult<T> = {
  status: number;
  value: T;
  idempotent: boolean;
};

type Queryable = Pick<PoolClient, "query">;

function assertMetadata(value: unknown): asserts value is MetadataPayload {
  if (!value || typeof value !== "object") {
    throw new AppError("invalid_metadata", "Metadata is required.", 400);
  }
  const record = value as Partial<MetadataPayload>;
  if (
    typeof record.fileName !== "string" ||
    typeof record.mimeType !== "string" ||
    typeof record.size !== "number"
  ) {
    throw new AppError("invalid_metadata", "Metadata is invalid.", 400);
  }
}

function validateDocumentMetadata(metadata: MetadataPayload): void {
  const allowed = getDocumentAllowedMimeTypes();
  if (!allowed.includes(metadata.mimeType)) {
    throw new AppError("invalid_mime_type", "Unsupported document MIME type.", 400);
  }
  const maxSize = getDocumentMaxSizeBytes();
  if (metadata.size > maxSize) {
    throw new AppError("document_too_large", "Document exceeds max size.", 400);
  }
}

async function recordDocumentUploadFailure(params: {
  actorUserId: string;
  targetUserId: string | null;
  ip?: string;
  userAgent?: string;
  client?: Queryable;
}): Promise<void> {
  await recordAuditEvent({
    action: "document_upload_rejected",
    actorUserId: params.actorUserId,
    targetUserId: params.targetUserId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: false,
    client: params.client,
  });
}

function canAccessApplication(role: Role, ownerUserId: string, actorId: string): boolean {
  if (actorId === ownerUserId) {
    return true;
  }
  return role === ROLES.ADMIN || role === ROLES.STAFF;
}

export async function transitionPipelineState(params: {
  applicationId: string;
  nextState: PipelineState;
  actorUserId: string | null;
  actorRole: Role | null;
  allowOverride: boolean;
  ip?: string;
  userAgent?: string;
  client?: Queryable;
}): Promise<void> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    await recordAuditEvent({
      action: "pipeline_state_changed",
      actorUserId: params.actorUserId,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
      client: params.client,
    });
    throw new AppError("not_found", "Application not found.", 404);
  }

  if (params.actorUserId && params.actorRole) {
    if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
      await recordAuditEvent({
        action: "pipeline_state_changed",
        actorUserId: params.actorUserId,
        targetUserId: application.owner_user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client: params.client,
      });
      throw new AppError("forbidden", "Not authorized.", 403);
    }
  }

  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }

  if (!canTransition(application.pipeline_state, params.nextState)) {
    await recordAuditEvent({
      action: "pipeline_state_changed",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
      client: params.client,
    });
    throw new AppError("invalid_transition", "Invalid pipeline transition.", 400);
  }

  await updateApplicationPipelineState({
    applicationId: params.applicationId,
    pipelineState: params.nextState,
    client: params.client,
  });
  await recordAuditEvent({
    action: "pipeline_state_changed",
    actorUserId: params.actorUserId,
    targetUserId: application.owner_user_id,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
    client: params.client,
  });

  if (params.allowOverride) {
    await recordAuditEvent({
      action: "admin_override",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client: params.client,
    });
  }
}

async function evaluateRequirements(params: {
  applicationId: string;
  actorUserId: string | null;
  actorRole: Role | null;
  ip?: string;
  userAgent?: string;
  client?: Queryable;
}): Promise<{ missingRequired: boolean }> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  const requirements = getRequirements({
    productType: application.product_type,
    pipelineState: application.pipeline_state,
  });

  let missingRequired = false;
  for (const requirement of requirements) {
    if (!requirement.required) {
      continue;
    }
    const latest = await findLatestDocumentVersionStatus({
      applicationId: application.id,
      documentType: requirement.documentType,
      client: params.client,
    });
    if (!latest) {
      missingRequired = true;
      break;
    }
    if (!latest.status || latest.status === "rejected") {
      missingRequired = true;
      break;
    }
  }

  if (missingRequired && application.pipeline_state === "NEW") {
    await transitionPipelineState({
      applicationId: application.id,
      nextState: "REQUIRES_DOCS",
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  return { missingRequired };
}

export async function createApplicationForUser(params: {
  ownerUserId: string;
  name: string;
  metadata: unknown | null;
  productType?: string | null;
  idempotencyKey?: string | null;
  actorUserId: string | null;
  actorRole?: Role | null;
  ip?: string;
  userAgent?: string;
}): Promise<IdempotentResult<ApplicationResponse>> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (params.idempotencyKey && params.actorUserId) {
      const existing = await findIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_APPLICATION,
        idempotencyKey: params.idempotencyKey,
        client,
      });
      if (existing) {
        await client.query("commit");
        return {
          status: existing.status_code,
          value: (existing.response_body as { application: ApplicationResponse })
            .application,
          idempotent: true,
        };
      }
    }

    const application = await createApplication({
      ownerUserId: params.ownerUserId,
      name: params.name,
      metadata: params.metadata,
      productType: params.productType ?? "standard",
      client,
    });
    await recordAuditEvent({
      action: "application_created",
      actorUserId: params.actorUserId,
      targetUserId: params.ownerUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    await evaluateRequirements({
      applicationId: application.id,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole ?? (params.actorUserId ? ROLES.USER : null),
      ip: params.ip,
      userAgent: params.userAgent,
      client,
    });

    const updated = await findApplicationById(application.id, client);
    if (!updated) {
      throw new AppError("not_found", "Application not found.", 404);
    }

    const response: ApplicationResponse = {
      id: updated.id,
      ownerUserId: updated.owner_user_id,
      name: updated.name,
      metadata: updated.metadata,
      productType: updated.product_type,
      pipelineState: updated.pipeline_state,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    if (params.idempotencyKey && params.actorUserId) {
      await createIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_APPLICATION,
        idempotencyKey: params.idempotencyKey,
        statusCode: 201,
        responseBody: { application: response },
        client,
      });
    }

    await client.query("commit");
    return { status: 201, value: response, idempotent: false };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function uploadDocument(params: {
  applicationId: string;
  documentId?: string | null;
  title: string;
  documentType?: string | null;
  metadata: unknown;
  content: string;
  idempotencyKey?: string | null;
  actorUserId: string;
  actorRole: Role;
  ip?: string;
  userAgent?: string;
}): Promise<IdempotentResult<DocumentUploadResponse>> {
  assertMetadata(params.metadata);
  try {
    validateDocumentMetadata(params.metadata);
  } catch (err) {
    await recordDocumentUploadFailure({
      actorUserId: params.actorUserId,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    throw err;
  }

  const application = await findApplicationById(params.applicationId);
  if (!application) {
    await recordAuditEvent({
      action: "document_uploaded",
      actorUserId: params.actorUserId,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("not_found", "Application not found.", 404);
  }

  if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
    await recordAuditEvent({
      action: "document_uploaded",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("forbidden", "Not authorized.", 403);
  }

  if (!isSupportedProductType(application.product_type)) {
    await recordDocumentUploadFailure({
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    throw new AppError("invalid_product", "Unsupported product type.", 400);
  }

  const documentCategory = getDocumentCategory(
    application.product_type,
    params.documentType ?? params.title
  );
  if (!documentCategory) {
    await recordDocumentUploadFailure({
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    throw new AppError("invalid_document_type", "Document type is not allowed.", 400);
  }

  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  const requirements = getRequirements({
    productType: application.product_type,
    pipelineState: application.pipeline_state,
  });
  const requirement = requirements.find(
    (item) => item.documentType === (params.documentType ?? params.title)
  );
  if (!requirement) {
    await recordDocumentUploadFailure({
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    throw new AppError("invalid_document_type", "Document type is not allowed.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    if (params.idempotencyKey) {
      const existing = await findIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_DOCUMENT,
        idempotencyKey: params.idempotencyKey,
        client,
      });
      if (existing) {
        await client.query("commit");
        return {
          status: existing.status_code,
          value: (existing.response_body as { document: DocumentUploadResponse })
            .document,
          idempotent: true,
        };
      }
    }

    let documentId = params.documentId ?? null;
    if (documentId) {
      const existingDoc = await findDocumentById(documentId, client);
      if (!existingDoc || existingDoc.application_id !== params.applicationId) {
        await client.query("rollback");
        throw new AppError("not_found", "Document not found.", 404);
      }
      if (existingDoc.document_type !== (params.documentType ?? existingDoc.document_type)) {
        await recordDocumentUploadFailure({
          actorUserId: params.actorUserId,
          targetUserId: application.owner_user_id,
          ip: params.ip,
          userAgent: params.userAgent,
          client,
        });
        throw new AppError("document_type_mismatch", "Document type mismatch.", 400);
      }
      const accepted = await findAcceptedDocumentVersion({
        documentId,
        client,
      });
      if (accepted) {
        await recordDocumentUploadFailure({
          actorUserId: params.actorUserId,
          targetUserId: application.owner_user_id,
          ip: params.ip,
          userAgent: params.userAgent,
          client,
        });
        throw new AppError(
          "document_immutable",
          "Accepted document versions cannot be modified.",
          409
        );
      }
    } else {
      if (!requirement.multipleAllowed) {
        const existing = await findDocumentByApplicationAndType({
          applicationId: params.applicationId,
          documentType: params.documentType ?? params.title,
          client,
        });
        if (existing) {
          await recordDocumentUploadFailure({
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
            client,
          });
          throw new AppError(
            "document_duplicate",
            "Multiple documents are not allowed for this type.",
            409
          );
        }
      }
      const doc = await createDocument({
        applicationId: params.applicationId,
        ownerUserId: application.owner_user_id,
        title: params.title,
        documentType: params.documentType ?? params.title,
        client,
      });
      documentId = doc.id;
    }

    const currentVersion = await getLatestDocumentVersion(documentId, client);
    const nextVersion = currentVersion + 1;
    if (nextVersion <= currentVersion) {
      await client.query("rollback");
      throw new AppError("version_conflict", "Invalid document version.", 409);
    }

    const version = await createDocumentVersion({
      documentId,
      version: nextVersion,
      metadata: params.metadata,
      content: params.content,
      client,
    });

    await recordAuditEvent({
      action: "document_uploaded",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    const response: DocumentUploadResponse = {
      documentId,
      versionId: version.id,
      version: version.version,
    };

    if (params.idempotencyKey) {
      await createIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_DOCUMENT,
        idempotencyKey: params.idempotencyKey,
        statusCode: 201,
        responseBody: { document: response },
        client,
      });
    }

    await client.query("commit");

    return { status: 201, value: response, idempotent: false };
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function changePipelineState(params: {
  applicationId: string;
  nextState: string;
  actorUserId: string;
  actorRole: Role;
  allowOverride: boolean;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  if (!isPipelineState(params.nextState)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState: params.nextState,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      allowOverride: params.allowOverride,
      ip: params.ip,
      userAgent: params.userAgent,
      client,
    });
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function acceptDocumentVersion(params: {
  applicationId: string;
  documentId: string;
  documentVersionId: string;
  actorUserId: string;
  actorRole: Role;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const application = await findApplicationById(params.applicationId, client);
    if (!application) {
      throw new AppError("not_found", "Application not found.", 404);
    }
    if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
      throw new AppError("forbidden", "Not authorized.", 403);
    }
    if (application.pipeline_state !== "REQUIRES_DOCS" && application.pipeline_state !== "NEW") {
      throw new AppError(
        "invalid_state",
        "Documents can only be reviewed while in REQUIRES_DOCS.",
        400
      );
    }

    const document = await findDocumentById(params.documentId, client);
    if (!document || document.application_id !== params.applicationId) {
      throw new AppError("not_found", "Document not found.", 404);
    }
    const version = await findDocumentVersionById(params.documentVersionId, client);
    if (!version || version.document_id !== params.documentId) {
      throw new AppError("not_found", "Document version not found.", 404);
    }
    const review = await findDocumentVersionReview(params.documentVersionId, client);
    if (review) {
      throw new AppError("version_reviewed", "Document version already reviewed.", 409);
    }

    await createDocumentVersionReview({
      documentVersionId: params.documentVersionId,
      status: "accepted",
      reviewedByUserId: params.actorUserId,
      client,
    });

    await recordAuditEvent({
      action: "document_accepted",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    const evaluation = await evaluateRequirements({
      applicationId: params.applicationId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      ip: params.ip,
      userAgent: params.userAgent,
      client,
    });

    if (!evaluation.missingRequired && application.pipeline_state === "REQUIRES_DOCS") {
      await transitionPipelineState({
        applicationId: params.applicationId,
        nextState: "UNDER_REVIEW",
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        allowOverride: false,
        ip: params.ip,
        userAgent: params.userAgent,
        client,
      });
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectDocumentVersion(params: {
  applicationId: string;
  documentId: string;
  documentVersionId: string;
  actorUserId: string;
  actorRole: Role;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const application = await findApplicationById(params.applicationId, client);
    if (!application) {
      throw new AppError("not_found", "Application not found.", 404);
    }
    if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
      throw new AppError("forbidden", "Not authorized.", 403);
    }
    if (application.pipeline_state !== "REQUIRES_DOCS" && application.pipeline_state !== "NEW") {
      throw new AppError(
        "invalid_state",
        "Documents can only be reviewed while in REQUIRES_DOCS.",
        400
      );
    }

    const document = await findDocumentById(params.documentId, client);
    if (!document || document.application_id !== params.applicationId) {
      throw new AppError("not_found", "Document not found.", 404);
    }
    const version = await findDocumentVersionById(params.documentVersionId, client);
    if (!version || version.document_id !== params.documentId) {
      throw new AppError("not_found", "Document version not found.", 404);
    }
    const review = await findDocumentVersionReview(params.documentVersionId, client);
    if (review) {
      throw new AppError("version_reviewed", "Document version already reviewed.", 409);
    }

    await createDocumentVersionReview({
      documentVersionId: params.documentVersionId,
      status: "rejected",
      reviewedByUserId: params.actorUserId,
      client,
    });

    await recordAuditEvent({
      action: "document_rejected",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    await evaluateRequirements({
      applicationId: params.applicationId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      ip: params.ip,
      userAgent: params.userAgent,
      client,
    });

    if (application.pipeline_state === "NEW") {
      await transitionPipelineState({
        applicationId: params.applicationId,
        nextState: "REQUIRES_DOCS",
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        allowOverride: false,
        ip: params.ip,
        userAgent: params.userAgent,
        client,
      });
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export function getPipelineStates(): string[] {
  return [...PIPELINE_STATES];
}
