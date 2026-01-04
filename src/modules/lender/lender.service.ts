import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { type PoolClient } from "pg";
import { findApplicationById, listLatestAcceptedDocumentVersions } from "../applications/applications.repo";
import { getRequirements } from "../applications/documentRequirements";
import { isPipelineState } from "../applications/pipelineState";
import { createIdempotencyRecord, findIdempotencyRecord } from "../idempotency/idempotency.repo";
import {
  createSubmission,
  findSubmissionByApplicationId,
  findSubmissionById,
  findSubmissionByIdempotencyKey,
} from "./lender.repo";
import { ensureApplicationSubmissionState } from "./lender.state";

const IDEMPOTENCY_SCOPE_LENDER = "lender_submission";

type IdempotentResult<T> = {
  statusCode: number;
  value: T;
  idempotent: boolean;
};

type SubmissionPacket = {
  application: {
    id: string;
    ownerUserId: string;
    name: string;
    metadata: unknown | null;
    productType: string;
  };
  documents: Array<{
    documentId: string;
    documentType: string;
    title: string;
    versionId: string;
    version: number;
    metadata: unknown;
    content: string;
  }>;
  submittedAt: string;
};

async function buildSubmissionPacket(params: {
  applicationId: string;
  submittedAt: Date;
  client: Pick<PoolClient, "query">;
}): Promise<SubmissionPacket> {
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
  const requiredTypes = requirements.filter((req) => req.required).map((req) => req.documentType);

  const documents = await listLatestAcceptedDocumentVersions({
    applicationId: application.id,
    documentTypes: requiredTypes,
    client: params.client,
  });

  if (documents.length !== requiredTypes.length) {
    throw new AppError(
      "missing_documents",
      "Required documents are missing or not accepted.",
      400
    );
  }

  return {
    application: {
      id: application.id,
      ownerUserId: application.owner_user_id,
      name: application.name,
      metadata: application.metadata,
      productType: application.product_type,
    },
    documents: documents.map((doc) => ({
      documentId: doc.document_id,
      documentType: doc.document_type,
      title: doc.title,
      versionId: doc.version_id,
      version: doc.version,
      metadata: doc.metadata,
      content: doc.content,
    })),
    submittedAt: params.submittedAt.toISOString(),
  };
}

export async function submitApplication(params: {
  applicationId: string;
  idempotencyKey: string | null;
  lenderId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<IdempotentResult<{ id: string; status: string }>> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (params.idempotencyKey) {
      const existingSubmission = await findSubmissionByIdempotencyKey(
        params.idempotencyKey,
        client
      );
      if (existingSubmission) {
        const existingApp = await findApplicationById(
          existingSubmission.application_id,
          client
        );
        await recordAuditEvent({
          action: "lender_submission_retried",
          actorUserId: params.actorUserId,
          targetUserId: existingApp?.owner_user_id ?? null,
          ip: params.ip,
          userAgent: params.userAgent,
          success: true,
          client,
        });
        await client.query("commit");
        return {
          statusCode: 201,
          value: { id: existingSubmission.id, status: existingSubmission.status },
          idempotent: true,
        };
      }

      const existing = await findIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_LENDER,
        idempotencyKey: params.idempotencyKey,
        client,
      });
      if (existing) {
        await recordAuditEvent({
          action: "lender_submission_retried",
          actorUserId: params.actorUserId,
          targetUserId: null,
          ip: params.ip,
          userAgent: params.userAgent,
          success: true,
          client,
        });
        await client.query("commit");
        return {
          statusCode: existing.status_code,
          value: (existing.response_body as { submission: { id: string; status: string } })
            .submission,
          idempotent: true,
        };
      }
    }

    const application = await findApplicationById(params.applicationId, client);
    if (!application) {
      await recordAuditEvent({
        action: "lender_submission_created",
        actorUserId: params.actorUserId,
        targetUserId: null,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      throw new AppError("not_found", "Application not found.", 404);
    }

    const existingSubmission = await findSubmissionByApplicationId(params.applicationId, client);
    if (existingSubmission) {
      await recordAuditEvent({
        action: "lender_submission_retried",
        actorUserId: params.actorUserId,
        targetUserId: application.owner_user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client,
      });
      await client.query("commit");
      return {
        statusCode: 200,
        value: { id: existingSubmission.id, status: existingSubmission.status },
        idempotent: true,
      };
    }

    await ensureApplicationSubmissionState({
      applicationId: params.applicationId,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      client,
    });

    const submittedAt = new Date();
    const packet = await buildSubmissionPacket({
      applicationId: params.applicationId,
      submittedAt,
      client,
    });

    const submission = await createSubmission({
      applicationId: params.applicationId,
      idempotencyKey: params.idempotencyKey,
      status: "submitted",
      lenderId: params.lenderId,
      submittedAt,
      payload: packet,
      client,
    });

    await recordAuditEvent({
      action: "lender_submission_created",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    if (params.idempotencyKey) {
      await createIdempotencyRecord({
        actorUserId: params.actorUserId,
        scope: IDEMPOTENCY_SCOPE_LENDER,
        idempotencyKey: params.idempotencyKey,
        statusCode: 201,
        responseBody: { submission: { id: submission.id, status: submission.status } },
        client,
      });
    }

    await client.query("commit");
    return {
      statusCode: 201,
      value: { id: submission.id, status: submission.status },
      idempotent: false,
    };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function getSubmissionStatus(id: string): Promise<{
  id: string;
  status: string;
  applicationId: string;
}> {
  const submission = await findSubmissionById(id);
  if (!submission) {
    throw new AppError("not_found", "Submission not found.", 404);
  }
  return {
    id: submission.id,
    status: submission.status,
    applicationId: submission.application_id,
  };
}
