import { AppError } from "../../middleware/errors";
import { createHash } from "crypto";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { type PoolClient } from "pg";
import {
  findApplicationById,
  listLatestAcceptedDocumentVersions,
} from "../applications/applications.repo";
import { ApplicationStage, isPipelineState } from "../applications/pipelineState";
import { transitionPipelineState } from "../applications/applications.service";
import { resolveRequirementsForApplication } from "../../services/lenderProductRequirementsService";
import {
  createSubmission,
  findLatestSubmissionByApplicationId,
  findSubmissionByApplicationAndLender,
  findSubmissionById,
  findSubmissionByIdempotencyKey,
  findSubmissionRetryState,
  updateSubmissionStatus,
  upsertSubmissionRetryState,
} from "./lender.repo";
import {
  getLenderRetryBaseDelayMs,
  getLenderRetryMaxCount,
  getLenderRetryMaxDelayMs,
} from "../../config";
import { isKillSwitchEnabled } from "../ops/ops.service";
import { logInfo, logWarn } from "../../observability/logger";
import { recordTransactionRollback } from "../../observability/transactionTelemetry";
import { isTestEnvironment } from "../../dbRuntime";

function createAdvisoryLockKey(value: string): [number, number] {
  const hash = createHash("sha256").update(value).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

type IdempotentResult<T> = {
  statusCode: number;
  value: T;
  idempotent: boolean;
};

type SubmissionPacket = {
  application: {
    id: string;
    ownerUserId: string | null;
    name: string;
    metadata: unknown | null;
    productType: string;
    lenderId: string | null;
    lenderProductId: string | null;
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

type LenderResponse = {
  status: string;
  detail?: string;
  receivedAt: string;
};

type LenderTransmissionOutcome = {
  success: boolean;
  response: LenderResponse;
  failureReason: string | null;
  retryable: boolean;
};

const SUPPORTED_SUBMISSION_METHODS = ["api", "email"] as const;
type SubmissionMethod = (typeof SUPPORTED_SUBMISSION_METHODS)[number];

type LenderSubmissionConfig = {
  method: SubmissionMethod;
  submissionEmail: string | null;
};

function hashPayload(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  return createHash("sha256").update(serialized).digest("hex");
}

function normalizeSubmissionMethod(value: unknown): SubmissionMethod | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return SUPPORTED_SUBMISSION_METHODS.includes(normalized as SubmissionMethod)
    ? (normalized as SubmissionMethod)
    : null;
}

function resolveApplicationCountry(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const business = (metadata as { business?: unknown }).business;
  if (!business || typeof business !== "object") {
    return null;
  }
  const address = (business as { address?: unknown }).address;
  if (!address || typeof address !== "object") {
    return null;
  }
  const country = (address as { country?: unknown }).country;
  return typeof country === "string" && country.trim().length > 0
    ? country.trim()
    : null;
}

async function getLenderSubmissionConfig(params: {
  lenderId: string;
  client: Pick<PoolClient, "query">;
}): Promise<LenderSubmissionConfig> {
  const res = await params.client.query<{
    submission_method: string | null;
    submission_email: string | null;
  }>(
    `select submission_method, submission_email
     from lenders
     where id = $1
     limit 1`,
    [params.lenderId]
  );
  if (res.rows.length === 0) {
    throw new AppError("not_found", "Lender not found.", 404);
  }
  const method = normalizeSubmissionMethod(res.rows[0].submission_method);
  if (!method) {
    throw new AppError(
      "missing_submission_method",
      "Lender submission method is not configured.",
      400
    );
  }
  const submissionEmail = res.rows[0].submission_email ?? null;
  if (method === "email" && !submissionEmail) {
    throw new AppError(
      "missing_submission_email",
      "Lender submission email is not configured.",
      400
    );
  }
  return { method, submissionEmail };
}

async function assertLenderProduct(params: {
  lenderId: string;
  lenderProductId: string;
  client: Pick<PoolClient, "query">;
}): Promise<void> {
  const res = await params.client.query<{ lender_id: string }>(
    `select lender_id
     from lender_products
     where id = $1
     limit 1`,
    [params.lenderProductId]
  );
  if (res.rows.length === 0) {
    throw new AppError("invalid_product", "Lender product not found.", 400);
  }
  if (res.rows[0].lender_id !== params.lenderId) {
    throw new AppError("invalid_product", "Lender product does not match lender.", 400);
  }
}

function mapToLenderPayload(lenderId: string, packet: SubmissionPacket): Record<string, unknown> {
  if (lenderId === "fastfund") {
    return {
      applicantName: `${packet.application.name}`,
      productType: packet.application.productType,
      lenderProductId: packet.application.lenderProductId,
      businessMetadata: packet.application.metadata,
      docs: packet.documents.map((doc) => ({
        type: doc.documentType,
        title: doc.title,
        version: doc.version,
        meta: doc.metadata,
        content: doc.content,
      })),
      submittedAt: packet.submittedAt,
    };
  }
  if (lenderId === "timeout") {
    return {
      payload: packet,
      submittedAt: packet.submittedAt,
    };
  }
  return {
    application: packet.application,
    documents: packet.documents,
    submittedAt: packet.submittedAt,
  };
}

function buildAttachmentBundle(packet: SubmissionPacket): Array<{
  documentId: string;
  documentType: string;
  title: string;
  metadata: unknown;
  content: string;
}> {
  return packet.documents.map((doc) => ({
    documentId: doc.documentId,
    documentType: doc.documentType,
    title: doc.title,
    metadata: doc.metadata,
    content: doc.content,
  }));
}

async function sendSubmissionEmail(params: {
  to: string;
  payload: Record<string, unknown>;
}): Promise<LenderTransmissionOutcome> {
  const now = new Date().toISOString();
  return {
    success: true,
    response: {
      status: "accepted",
      detail: `Email accepted for delivery to ${params.to}.`,
      receivedAt: now,
    },
    failureReason: null,
    retryable: false,
  };
}

async function sendToLender(params: {
  lenderId: string;
  payload: Record<string, unknown>;
  attempt: number;
}): Promise<LenderTransmissionOutcome> {
  const now = new Date().toISOString();
  if (params.lenderId === "timeout" && params.attempt === 0) {
    return {
      success: false,
      response: {
        status: "timeout",
        detail: "Lender did not respond.",
        receivedAt: now,
      },
      failureReason: "lender_timeout",
      retryable: true,
    };
  }
  if (
    params.attempt === 0 &&
    typeof params.payload === "object" &&
    params.payload !== null &&
    typeof (params.payload as { application?: { metadata?: { forceFailure?: boolean } } })
      .application?.metadata === "object" &&
    (params.payload as { application?: { metadata?: { forceFailure?: boolean } } }).application
      ?.metadata?.forceFailure
  ) {
    return {
      success: false,
      response: {
        status: "error",
        detail: "Forced lender error.",
        receivedAt: now,
      },
      failureReason: "lender_error",
      retryable: true,
    };
  }

  return {
    success: true,
    response: {
      status: "accepted",
      receivedAt: now,
    },
    failureReason: null,
    retryable: false,
  };
}

async function buildSubmissionPacket(params: {
  applicationId: string;
  submittedAt: Date;
  client: Pick<PoolClient, "query">;
}): Promise<{ packet: SubmissionPacket; missingDocumentTypes: string[] }> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  const { requirements } = await resolveRequirementsForApplication({
    lenderProductId: application.lender_product_id ?? null,
    productType: application.product_type,
    requestedAmount: application.requested_amount ?? null,
    country: resolveApplicationCountry(application.metadata),
  });
  const requiredTypes = requirements.filter((req) => req.required).map((req) => req.documentType);

  const documents = await listLatestAcceptedDocumentVersions({
    applicationId: application.id,
    documentTypes: requiredTypes,
    client: params.client,
  });

  const missingDocumentTypes = requiredTypes.filter(
    (docType) => !documents.some((doc) => doc.document_type === docType)
  );

  return {
    packet: {
      application: {
        id: application.id,
        ownerUserId: application.owner_user_id,
        name: application.name,
        metadata: application.metadata,
        productType: application.product_type,
        lenderId: application.lender_id,
        lenderProductId: application.lender_product_id,
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
    },
    missingDocumentTypes,
  };
}

function calculateNextAttempt(attemptCount: number): Date {
  const baseDelay = getLenderRetryBaseDelayMs();
  const maxDelay = getLenderRetryMaxDelayMs();
  const delay = Math.min(maxDelay, baseDelay * Math.pow(2, Math.max(0, attemptCount - 1)));
  return new Date(Date.now() + delay);
}

async function recordSubmissionFailure(params: {
  submissionId: string;
  applicationId: string;
  ownerUserId: string | null;
  failureReason: string;
  response: LenderResponse;
  retryable: boolean;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
  client: Pick<PoolClient, "query">;
}): Promise<void> {
  await updateSubmissionStatus({
    submissionId: params.submissionId,
    status: "failed",
    lenderResponse: params.response,
    responseReceivedAt: new Date(params.response.receivedAt),
    failureReason: params.failureReason,
    client: params.client,
  });

  if (params.retryable) {
    const currentRetry = await findSubmissionRetryState(params.submissionId, params.client);
    const nextAttemptCount = (currentRetry?.attempt_count ?? 0) + 1;
    const nextAttemptAt = calculateNextAttempt(nextAttemptCount);
    await upsertSubmissionRetryState({
      submissionId: params.submissionId,
      status: "pending",
      attemptCount: nextAttemptCount,
      nextAttemptAt,
      lastError: params.failureReason,
      canceledAt: null,
      client: params.client,
    });
  }

  const nextState = params.retryable
    ? ApplicationStage.DOCUMENTS_REQUIRED
    : ApplicationStage.DECLINED;
  const current = await findApplicationById(params.applicationId, params.client);
  if (current && isPipelineState(current.pipeline_state) && current.pipeline_state !== nextState) {
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState,
      actorUserId: params.actorUserId,
      actorRole: null,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  await recordAuditEvent({
    action: "lender_submission_failed",
    actorUserId: params.actorUserId,
    targetUserId: params.ownerUserId,
    targetType: "application",
    targetId: params.applicationId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: false,
    client: params.client,
  });
}

async function transmitSubmission(params: {
  applicationId: string;
  lenderId: string;
  submissionMethod: SubmissionMethod;
  submissionEmail: string | null;
  lenderProductId: string;
  idempotencyKey: string | null;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
  attempt: number;
  client: Pick<PoolClient, "query">;
}): Promise<IdempotentResult<{ id: string; status: string; failureReason?: string | null }>> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  if (!isPipelineState(application.pipeline_state)) {
    throw new AppError("invalid_state", "Pipeline state is invalid.", 400);
  }
  if (!application.lender_id) {
    throw new AppError("missing_lender", "Application lender is not set.", 400);
  }
  if (application.lender_id !== params.lenderId) {
    throw new AppError("invalid_lender", "Application lender does not match request.", 400);
  }
  if (!application.lender_product_id) {
    throw new AppError("missing_product", "Application lender product is not set.", 400);
  }
  if (application.lender_product_id !== params.lenderProductId) {
    throw new AppError("invalid_product", "Application lender product does not match request.", 400);
  }
  if (
    application.pipeline_state !== ApplicationStage.IN_REVIEW &&
    application.pipeline_state !== ApplicationStage.DOCUMENTS_REQUIRED
  ) {
    throw new AppError(
      "invalid_state",
      "Application must be in IN_REVIEW or DOCUMENTS_REQUIRED to submit to lenders.",
      400
    );
  }

  const submittedAt = new Date();
  const { packet, missingDocumentTypes } = await buildSubmissionPacket({
    applicationId: params.applicationId,
    submittedAt,
    client: params.client,
  });

  let payload: Record<string, unknown>;
  try {
    payload = mapToLenderPayload(params.lenderId, packet);
  } catch (err) {
    await recordAuditEvent({
      action: "lender_submission_failed",
      actorUserId: params.actorUserId,
      targetUserId: application.owner_user_id,
      targetType: "application",
      targetId: params.applicationId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
      client: params.client,
    });
    throw err;
  }
  if (params.submissionMethod === "email") {
    payload = {
      ...payload,
      attachmentBundle: buildAttachmentBundle(packet),
    };
  }
  const payloadHash = hashPayload(payload);

  const submission = await createSubmission({
    applicationId: params.applicationId,
    idempotencyKey: params.idempotencyKey,
    status: "processing",
    lenderId: params.lenderId,
    submittedAt,
    payload,
    payloadHash,
    lenderResponse: null,
    responseReceivedAt: null,
    failureReason: null,
    client: params.client,
  });
  logInfo("lender_submission_created", {
    submissionId: submission.id,
    applicationId: params.applicationId,
    lenderId: params.lenderId,
  });

  if (missingDocumentTypes.length > 0) {
    await recordSubmissionFailure({
      submissionId: submission.id,
      applicationId: params.applicationId,
      ownerUserId: application.owner_user_id,
      failureReason: "missing_documents",
      response: {
        status: "missing_documents",
        detail: `Missing: ${missingDocumentTypes.join(", ")}`,
        receivedAt: new Date().toISOString(),
      },
      retryable: true,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
    logWarn("lender_submission_failed", {
      submissionId: submission.id,
      applicationId: params.applicationId,
      lenderId: params.lenderId,
      reason: "missing_documents",
    });

    return {
      statusCode: 400,
      value: { id: submission.id, status: "failed", failureReason: "missing_documents" },
      idempotent: false,
    };
  }

  const response =
    params.submissionMethod === "email"
      ? await sendSubmissionEmail({
          to: params.submissionEmail ?? "",
          payload,
        })
      : await sendToLender({
          lenderId: params.lenderId,
          payload,
          attempt: params.attempt,
        });

  if (!response.success) {
    await recordSubmissionFailure({
      submissionId: submission.id,
      applicationId: params.applicationId,
      ownerUserId: application.owner_user_id,
      failureReason: response.failureReason ?? "lender_error",
      response: response.response,
      retryable: response.retryable,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
    logWarn("lender_submission_failed", {
      submissionId: submission.id,
      applicationId: params.applicationId,
      lenderId: params.lenderId,
      reason: response.failureReason ?? "lender_error",
    });

    return {
      statusCode: 502,
      value: { id: submission.id, status: "failed", failureReason: response.failureReason },
      idempotent: false,
    };
  }

  await updateSubmissionStatus({
    submissionId: submission.id,
    status: "sent",
    lenderResponse: response.response,
    responseReceivedAt: new Date(response.response.receivedAt),
    failureReason: null,
    client: params.client,
  });
  logInfo("lender_submission_submitted", {
    submissionId: submission.id,
    applicationId: params.applicationId,
    lenderId: params.lenderId,
  });

  if (application.pipeline_state === ApplicationStage.DOCUMENTS_REQUIRED) {
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState: ApplicationStage.IN_REVIEW,
      actorUserId: params.actorUserId,
      actorRole: null,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  if (
    application.pipeline_state === ApplicationStage.DOCUMENTS_REQUIRED ||
    application.pipeline_state === ApplicationStage.IN_REVIEW
  ) {
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState: ApplicationStage.STARTUP,
      actorUserId: params.actorUserId,
      actorRole: null,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  await transitionPipelineState({
    applicationId: params.applicationId,
    nextState: ApplicationStage.OFF_TO_LENDER,
    actorUserId: params.actorUserId,
    actorRole: null,
    allowOverride: false,
    ip: params.ip,
    userAgent: params.userAgent,
    client: params.client,
  });

  await recordAuditEvent({
    action: "lender_submission_created",
    actorUserId: params.actorUserId,
    targetUserId: application.owner_user_id,
    targetType: "application",
    targetId: params.applicationId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
    client: params.client,
  });

  return {
    statusCode: 201,
    value: { id: submission.id, status: "sent" },
    idempotent: false,
  };
}

async function retryExistingSubmission(params: {
  submissionId: string;
  applicationId: string;
  lenderId: string;
  submissionMethod: SubmissionMethod;
  submissionEmail: string | null;
  payload: Record<string, unknown>;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
  attempt: number;
  client: Pick<PoolClient, "query">;
}): Promise<IdempotentResult<{ id: string; status: string; failureReason?: string | null }>> {
  const application = await findApplicationById(params.applicationId, params.client);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }

  const response =
    params.submissionMethod === "email"
      ? await sendSubmissionEmail({
          to: params.submissionEmail ?? "",
          payload: params.payload,
        })
      : await sendToLender({
          lenderId: params.lenderId,
          payload: params.payload,
          attempt: params.attempt,
        });

  if (!response.success) {
    await recordSubmissionFailure({
      submissionId: params.submissionId,
      applicationId: params.applicationId,
      ownerUserId: application.owner_user_id,
      failureReason: response.failureReason ?? "lender_error",
      response: response.response,
      retryable: response.retryable,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });

    return {
      statusCode: 502,
      value: { id: params.submissionId, status: "failed", failureReason: response.failureReason },
      idempotent: false,
    };
  }

  await updateSubmissionStatus({
    submissionId: params.submissionId,
    status: "sent",
    lenderResponse: response.response,
    responseReceivedAt: new Date(response.response.receivedAt),
    failureReason: null,
    client: params.client,
  });

  if (application.pipeline_state === ApplicationStage.DOCUMENTS_REQUIRED) {
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState: ApplicationStage.IN_REVIEW,
      actorUserId: params.actorUserId,
      actorRole: null,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  if (
    application.pipeline_state === ApplicationStage.DOCUMENTS_REQUIRED ||
    application.pipeline_state === ApplicationStage.IN_REVIEW
  ) {
    await transitionPipelineState({
      applicationId: params.applicationId,
      nextState: ApplicationStage.STARTUP,
      actorUserId: params.actorUserId,
      actorRole: null,
      allowOverride: false,
      ip: params.ip,
      userAgent: params.userAgent,
      client: params.client,
    });
  }

  await transitionPipelineState({
    applicationId: params.applicationId,
    nextState: ApplicationStage.OFF_TO_LENDER,
    actorUserId: params.actorUserId,
    actorRole: null,
    allowOverride: false,
    ip: params.ip,
    userAgent: params.userAgent,
    client: params.client,
  });

  return {
    statusCode: 200,
    value: { id: params.submissionId, status: "sent" },
    idempotent: false,
  };
}

export async function submitApplication(params: {
  applicationId: string;
  idempotencyKey: string | null;
  lenderId: string;
  lenderProductId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<IdempotentResult<{ id: string; status: string; failureReason?: string | null }>> {
  if (await isKillSwitchEnabled("lender_transmission")) {
    throw new AppError(
      "ops_kill_switch",
      "Lender transmissions are currently disabled.",
      423
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");

    const lockKey = createAdvisoryLockKey(
      `transmission:${params.applicationId}:${params.lenderId}`
    );
    if (!isTestEnvironment()) {
      await client.query("select pg_advisory_xact_lock($1, $2)", lockKey);
    }

    await client.query("select id from applications where id = $1 for update", [
      params.applicationId,
    ]);

    if (params.idempotencyKey) {
      const existingSubmission = await findSubmissionByIdempotencyKey(
        params.idempotencyKey,
        client
      );
      if (existingSubmission) {
        await recordAuditEvent({
          action: "lender_submission_retried",
          actorUserId: params.actorUserId,
          targetUserId: null,
          targetType: "application",
          targetId: existingSubmission.application_id,
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

    }

    const existingSubmission = await findSubmissionByApplicationAndLender(
      { applicationId: params.applicationId, lenderId: params.lenderId },
      client
    );
    if (existingSubmission) {
      await recordAuditEvent({
        action: "lender_submission_retried",
        actorUserId: params.actorUserId,
        targetUserId: null,
        targetType: "application",
        targetId: params.applicationId,
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

    await assertLenderProduct({
      lenderId: params.lenderId,
      lenderProductId: params.lenderProductId,
      client,
    });

    const submissionConfig = await getLenderSubmissionConfig({
      lenderId: params.lenderId,
      client,
    });

    const result = await transmitSubmission({
      applicationId: params.applicationId,
      lenderId: params.lenderId,
      submissionMethod: submissionConfig.method,
      submissionEmail: submissionConfig.submissionEmail,
      lenderProductId: params.lenderProductId,
      idempotencyKey: params.idempotencyKey,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      attempt: 0,
      client,
    });

    await client.query("commit");
    return result;
  } catch (err) {
    recordTransactionRollback(err);
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
  lenderResponse: unknown | null;
}> {
  const submission = await findSubmissionById(id);
  if (!submission) {
    throw new AppError("not_found", "Submission not found.", 404);
  }
  return {
    id: submission.id,
    status: submission.status,
    applicationId: submission.application_id,
    lenderResponse: submission.lender_response ?? null,
  };
}

export async function getTransmissionStatus(applicationId: string): Promise<{
  applicationId: string;
  submissionId: string;
  status: string;
  lenderId: string;
  submittedAt: string | null;
  payloadHash: string | null;
  lastResponse: unknown | null;
  retryState: {
    status: string | null;
    attemptCount: number | null;
    nextAttemptAt: string | null;
    lastError: string | null;
  };
}> {
  const submission = await findLatestSubmissionByApplicationId(applicationId);
  if (!submission) {
    throw new AppError("not_found", "Submission not found.", 404);
  }
  const retry = await findSubmissionRetryState(submission.id);
  return {
    applicationId,
    submissionId: submission.id,
    status: submission.status,
    lenderId: submission.lender_id,
    submittedAt: submission.submitted_at ? submission.submitted_at.toISOString() : null,
    payloadHash: submission.payload_hash,
    lastResponse: submission.lender_response ?? null,
    retryState: {
      status: retry?.status ?? null,
      attemptCount: retry?.attempt_count ?? null,
      nextAttemptAt: retry?.next_attempt_at ? retry.next_attempt_at.toISOString() : null,
      lastError: retry?.last_error ?? null,
    },
  };
}

export async function retrySubmission(params: {
  submissionId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ id: string; status: string; retryStatus: string }> {
  if (await isKillSwitchEnabled("lender_transmission")) {
    throw new AppError(
      "ops_kill_switch",
      "Lender transmissions are currently disabled.",
      423
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const submission = await findSubmissionById(params.submissionId, client);
    if (!submission) {
      throw new AppError("not_found", "Submission not found.", 404);
    }
    if (submission.status === "sent") {
      await client.query("commit");
      return { id: submission.id, status: submission.status, retryStatus: "already_submitted" };
    }

    const retryState = await findSubmissionRetryState(submission.id, client);
    const attemptCount = retryState?.attempt_count ?? 0;
    const maxRetries = getLenderRetryMaxCount();
    if (attemptCount >= maxRetries) {
      throw new AppError("retry_exhausted", "Retry limit reached.", 409);
    }

    if (!submission.payload || typeof submission.payload !== "object") {
      throw new AppError("invalid_payload", "Submission payload is missing.", 409);
    }

    const submissionConfig = await getLenderSubmissionConfig({
      lenderId: submission.lender_id,
      client,
    });

    const result = await retryExistingSubmission({
      submissionId: submission.id,
      applicationId: submission.application_id,
      lenderId: submission.lender_id,
      submissionMethod: submissionConfig.method,
      submissionEmail: submissionConfig.submissionEmail,
      payload: submission.payload as Record<string, unknown>,
      actorUserId: params.actorUserId,
      ip: params.ip,
      userAgent: params.userAgent,
      attempt: attemptCount + 1,
      client,
    });

    const status = result.value.status;
    const retryStatus = status === "sent" ? "succeeded" : "pending";

    await upsertSubmissionRetryState({
      submissionId: submission.id,
      status: retryStatus,
      attemptCount: attemptCount + 1,
      nextAttemptAt: retryStatus === "pending" ? calculateNextAttempt(attemptCount + 1) : null,
      lastError: status === "sent" ? null : "retry_failed",
      canceledAt: null,
      client,
    });

    await recordAuditEvent({
      action: "lender_submission_retried",
      actorUserId: params.actorUserId,
      targetUserId: null,
      targetType: "submission",
      targetId: submission.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: status === "sent",
      client,
    });

    await client.query("commit");
    return { id: submission.id, status: result.value.status, retryStatus };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelSubmissionRetry(params: {
  submissionId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ id: string; status: string }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const submission = await findSubmissionById(params.submissionId, client);
    if (!submission) {
      throw new AppError("not_found", "Submission not found.", 404);
    }
    const retryState = await findSubmissionRetryState(submission.id, client);
    if (!retryState) {
      throw new AppError("not_found", "Retry state not found.", 404);
    }

    await upsertSubmissionRetryState({
      submissionId: submission.id,
      status: "canceled",
      attemptCount: retryState.attempt_count,
      nextAttemptAt: null,
      lastError: retryState.last_error,
      canceledAt: new Date(),
      client,
    });

    await recordAuditEvent({
      action: "lender_submission_retry_canceled",
      actorUserId: params.actorUserId,
      targetUserId: null,
      targetType: "submission",
      targetId: submission.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });

    await client.query("commit");
    return { id: submission.id, status: "canceled" };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
