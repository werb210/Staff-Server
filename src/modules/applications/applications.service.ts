import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import {
  createApplication,
  createDocument,
  createDocumentVersion,
  findApplicationById,
  findDocumentById,
  getLatestDocumentVersion,
  updateApplicationPipelineState,
} from "./applications.repo";
import { pool } from "../../db";
import { type Role, ROLES } from "../../auth/roles";

const allowedPipelineStates = [
  "new",
  "requires_docs",
  "under_review",
  "submitted",
  "funded",
  "declined",
] as const;

type PipelineState = (typeof allowedPipelineStates)[number];

function isPipelineState(value: string): value is PipelineState {
  return (allowedPipelineStates as readonly string[]).includes(value);
}

const legalTransitions: Record<string, readonly string[]> = {
  new: ["requires_docs", "under_review"],
  requires_docs: ["under_review"],
  under_review: ["submitted", "declined"],
  submitted: ["funded", "declined"],
  funded: [],
  declined: [],
};

export type ApplicationResponse = {
  id: string;
  ownerUserId: string;
  name: string;
  metadata: unknown | null;
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

function canAccessApplication(role: Role, ownerUserId: string, actorId: string): boolean {
  if (actorId === ownerUserId) {
    return true;
  }
  return role === ROLES.ADMIN || role === ROLES.STAFF;
}

export async function createApplicationForUser(params: {
  ownerUserId: string;
  name: string;
  metadata: unknown | null;
  actorUserId: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<ApplicationResponse> {
  const application = await createApplication({
    ownerUserId: params.ownerUserId,
    name: params.name,
    metadata: params.metadata,
  });
  await recordAuditEvent({
    action: "application_created",
    actorUserId: params.actorUserId,
    targetUserId: params.ownerUserId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
  return {
    id: application.id,
    ownerUserId: application.owner_user_id,
    name: application.name,
    metadata: application.metadata,
    pipelineState: application.pipeline_state,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
  };
}

export async function uploadDocument(params: {
  applicationId: string;
  documentId?: string | null;
  title: string;
  metadata: unknown;
  content: string;
  actorUserId: string;
  actorRole: Role;
  ip?: string;
  userAgent?: string;
}): Promise<DocumentUploadResponse> {
  assertMetadata(params.metadata);

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

  const client = await pool.connect();
  try {
    await client.query("begin");
    let documentId = params.documentId ?? null;
    if (documentId) {
      const existingDoc = await findDocumentById(documentId, client);
      if (!existingDoc || existingDoc.application_id !== params.applicationId) {
        await client.query("rollback");
        throw new AppError("not_found", "Document not found.", 404);
      }
    } else {
      const doc = await createDocument({
        applicationId: params.applicationId,
        ownerUserId: application.owner_user_id,
        title: params.title,
        client,
      });
      documentId = doc.id;
    }

    const currentVersion = await getLatestDocumentVersion(documentId, client);
    const nextVersion = currentVersion + 1;
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
    await client.query("commit");

    return {
      documentId,
      versionId: version.id,
      version: version.version,
    };
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

  const application = await findApplicationById(params.applicationId);
  if (!application) {
    await recordAuditEvent({
      action: "pipeline_state_changed",
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
      action: "pipeline_state_changed",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("forbidden", "Not authorized.", 403);
  }

  const legalNext = legalTransitions[application.pipeline_state] ?? [];
  if (!params.allowOverride && !legalNext.includes(params.nextState)) {
    await recordAuditEvent({
      action: "pipeline_state_changed",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("invalid_transition", "Invalid pipeline transition.", 400);
  }

  await updateApplicationPipelineState({
    applicationId: params.applicationId,
    pipelineState: params.nextState,
  });
  await recordAuditEvent({
    action: "pipeline_state_changed",
    actorUserId: params.actorUserId,
    targetUserId: application.owner_user_id,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
}

export function getPipelineStates(): string[] {
  return [...allowedPipelineStates];
}
