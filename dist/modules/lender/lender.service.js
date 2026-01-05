"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitApplication = submitApplication;
exports.getSubmissionStatus = getSubmissionStatus;
exports.getTransmissionStatus = getTransmissionStatus;
exports.retrySubmission = retrySubmission;
exports.cancelSubmissionRetry = cancelSubmissionRetry;
const errors_1 = require("../../middleware/errors");
const audit_service_1 = require("../audit/audit.service");
const db_1 = require("../../db");
const applications_repo_1 = require("../applications/applications.repo");
const documentRequirements_1 = require("../applications/documentRequirements");
const pipelineState_1 = require("../applications/pipelineState");
const applications_service_1 = require("../applications/applications.service");
const idempotency_repo_1 = require("../idempotency/idempotency.repo");
const lender_repo_1 = require("./lender.repo");
const config_1 = require("../../config");
const crypto_1 = require("crypto");
const ops_service_1 = require("../ops/ops.service");
const IDEMPOTENCY_SCOPE_LENDER = "lender_submission";
function hashPayload(payload) {
    const serialized = JSON.stringify(payload);
    return (0, crypto_1.createHash)("sha256").update(serialized).digest("hex");
}
function mapToLenderPayload(lenderId, packet) {
    switch (lenderId) {
        case "default":
            return {
                application: packet.application,
                documents: packet.documents,
                submittedAt: packet.submittedAt,
            };
        case "fastfund":
            return {
                applicantName: `${packet.application.name}`,
                productType: packet.application.productType,
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
        case "timeout":
            return {
                payload: packet,
                submittedAt: packet.submittedAt,
            };
        default:
            throw new errors_1.AppError("unsupported_lender", "Unsupported lender.", 400);
    }
}
async function sendToLender(params) {
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
async function buildSubmissionPacket(params) {
    const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, params.client);
    if (!application) {
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    if (!(0, pipelineState_1.isPipelineState)(application.pipeline_state)) {
        throw new errors_1.AppError("invalid_state", "Pipeline state is invalid.", 400);
    }
    const requirements = (0, documentRequirements_1.getRequirements)({
        productType: application.product_type,
        pipelineState: application.pipeline_state,
    });
    const requiredTypes = requirements.filter((req) => req.required).map((req) => req.documentType);
    const documents = await (0, applications_repo_1.listLatestAcceptedDocumentVersions)({
        applicationId: application.id,
        documentTypes: requiredTypes,
        client: params.client,
    });
    const missingDocumentTypes = requiredTypes.filter((docType) => !documents.some((doc) => doc.document_type === docType));
    return {
        packet: {
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
        },
        missingDocumentTypes,
    };
}
function calculateNextAttempt(attemptCount) {
    const baseDelay = (0, config_1.getLenderRetryBaseDelayMs)();
    const maxDelay = (0, config_1.getLenderRetryMaxDelayMs)();
    const delay = Math.min(maxDelay, baseDelay * Math.pow(2, Math.max(0, attemptCount - 1)));
    return new Date(Date.now() + delay);
}
async function recordSubmissionFailure(params) {
    await (0, lender_repo_1.updateSubmissionStatus)({
        submissionId: params.submissionId,
        status: "failed",
        lenderResponse: params.response,
        responseReceivedAt: new Date(params.response.receivedAt),
        failureReason: params.failureReason,
        client: params.client,
    });
    if (params.retryable) {
        const currentRetry = await (0, lender_repo_1.findSubmissionRetryState)(params.submissionId, params.client);
        const nextAttemptCount = (currentRetry?.attempt_count ?? 0) + 1;
        const nextAttemptAt = calculateNextAttempt(nextAttemptCount);
        await (0, lender_repo_1.upsertSubmissionRetryState)({
            submissionId: params.submissionId,
            status: "pending",
            attemptCount: nextAttemptCount,
            nextAttemptAt,
            lastError: params.failureReason,
            canceledAt: null,
            client: params.client,
        });
    }
    const nextState = params.retryable ? "REQUIRES_DOCS" : "DECLINED";
    const current = await (0, applications_repo_1.findApplicationById)(params.applicationId, params.client);
    if (current && (0, pipelineState_1.isPipelineState)(current.pipeline_state) && current.pipeline_state !== nextState) {
        await (0, applications_service_1.transitionPipelineState)({
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
    await (0, audit_service_1.recordAuditEvent)({
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
async function transmitSubmission(params) {
    const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, params.client);
    if (!application) {
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    if (!(0, pipelineState_1.isPipelineState)(application.pipeline_state)) {
        throw new errors_1.AppError("invalid_state", "Pipeline state is invalid.", 400);
    }
    if (application.pipeline_state !== "UNDER_REVIEW" && application.pipeline_state !== "REQUIRES_DOCS") {
        throw new errors_1.AppError("invalid_state", "Application must be in UNDER_REVIEW or REQUIRES_DOCS to submit to lenders.", 400);
    }
    const submittedAt = new Date();
    const { packet, missingDocumentTypes } = await buildSubmissionPacket({
        applicationId: params.applicationId,
        submittedAt,
        client: params.client,
    });
    let payload;
    try {
        payload = mapToLenderPayload(params.lenderId, packet);
    }
    catch (err) {
        await (0, audit_service_1.recordAuditEvent)({
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
    const payloadHash = hashPayload(payload);
    const submission = await (0, lender_repo_1.createSubmission)({
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
        return {
            statusCode: 400,
            value: { id: submission.id, status: "failed", failureReason: "missing_documents" },
            idempotent: false,
        };
    }
    const response = await sendToLender({
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
        return {
            statusCode: 502,
            value: { id: submission.id, status: "failed", failureReason: response.failureReason },
            idempotent: false,
        };
    }
    await (0, lender_repo_1.updateSubmissionStatus)({
        submissionId: submission.id,
        status: "submitted",
        lenderResponse: response.response,
        responseReceivedAt: new Date(response.response.receivedAt),
        failureReason: null,
        client: params.client,
    });
    if (application.pipeline_state === "REQUIRES_DOCS") {
        await (0, applications_service_1.transitionPipelineState)({
            applicationId: params.applicationId,
            nextState: "UNDER_REVIEW",
            actorUserId: params.actorUserId,
            actorRole: null,
            allowOverride: false,
            ip: params.ip,
            userAgent: params.userAgent,
            client: params.client,
        });
    }
    await (0, applications_service_1.transitionPipelineState)({
        applicationId: params.applicationId,
        nextState: "LENDER_SUBMITTED",
        actorUserId: params.actorUserId,
        actorRole: null,
        allowOverride: false,
        ip: params.ip,
        userAgent: params.userAgent,
        client: params.client,
    });
    await (0, audit_service_1.recordAuditEvent)({
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
        value: { id: submission.id, status: "submitted" },
        idempotent: false,
    };
}
async function retryExistingSubmission(params) {
    const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, params.client);
    if (!application) {
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    const response = await sendToLender({
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
    await (0, lender_repo_1.updateSubmissionStatus)({
        submissionId: params.submissionId,
        status: "submitted",
        lenderResponse: response.response,
        responseReceivedAt: new Date(response.response.receivedAt),
        failureReason: null,
        client: params.client,
    });
    if (application.pipeline_state === "REQUIRES_DOCS") {
        await (0, applications_service_1.transitionPipelineState)({
            applicationId: params.applicationId,
            nextState: "UNDER_REVIEW",
            actorUserId: params.actorUserId,
            actorRole: null,
            allowOverride: false,
            ip: params.ip,
            userAgent: params.userAgent,
            client: params.client,
        });
    }
    await (0, applications_service_1.transitionPipelineState)({
        applicationId: params.applicationId,
        nextState: "LENDER_SUBMITTED",
        actorUserId: params.actorUserId,
        actorRole: null,
        allowOverride: false,
        ip: params.ip,
        userAgent: params.userAgent,
        client: params.client,
    });
    return {
        statusCode: 200,
        value: { id: params.submissionId, status: "submitted" },
        idempotent: false,
    };
}
async function submitApplication(params) {
    if (await (0, ops_service_1.isKillSwitchEnabled)("lender_transmission")) {
        throw new errors_1.AppError("ops_kill_switch", "Lender transmissions are currently disabled.", 423);
    }
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        await client.query("select id from applications where id = $1 for update", [
            params.applicationId,
        ]);
        if (params.idempotencyKey) {
            const existingSubmission = await (0, lender_repo_1.findSubmissionByIdempotencyKey)(params.idempotencyKey, client);
            if (existingSubmission) {
                await (0, audit_service_1.recordAuditEvent)({
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
            const existing = await (0, idempotency_repo_1.findIdempotencyRecord)({
                actorUserId: params.actorUserId,
                scope: IDEMPOTENCY_SCOPE_LENDER,
                idempotencyKey: params.idempotencyKey,
                client,
            });
            if (existing) {
                await (0, audit_service_1.recordAuditEvent)({
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
                    value: existing.response_body
                        .submission,
                    idempotent: true,
                };
            }
        }
        const existingSubmission = await (0, lender_repo_1.findSubmissionByApplicationAndLender)({ applicationId: params.applicationId, lenderId: params.lenderId }, client);
        if (existingSubmission) {
            await (0, audit_service_1.recordAuditEvent)({
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
        const result = await transmitSubmission({
            applicationId: params.applicationId,
            lenderId: params.lenderId,
            idempotencyKey: params.idempotencyKey,
            actorUserId: params.actorUserId,
            ip: params.ip,
            userAgent: params.userAgent,
            attempt: 0,
            client,
        });
        if (params.idempotencyKey) {
            await (0, idempotency_repo_1.createIdempotencyRecord)({
                actorUserId: params.actorUserId,
                scope: IDEMPOTENCY_SCOPE_LENDER,
                idempotencyKey: params.idempotencyKey,
                statusCode: result.statusCode,
                responseBody: { submission: result.value },
                client,
            });
        }
        await client.query("commit");
        return result;
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
async function getSubmissionStatus(id) {
    const submission = await (0, lender_repo_1.findSubmissionById)(id);
    if (!submission) {
        throw new errors_1.AppError("not_found", "Submission not found.", 404);
    }
    return {
        id: submission.id,
        status: submission.status,
        applicationId: submission.application_id,
        lenderResponse: submission.lender_response ?? null,
    };
}
async function getTransmissionStatus(applicationId) {
    const submission = await (0, lender_repo_1.findLatestSubmissionByApplicationId)(applicationId);
    if (!submission) {
        throw new errors_1.AppError("not_found", "Submission not found.", 404);
    }
    const retry = await (0, lender_repo_1.findSubmissionRetryState)(submission.id);
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
async function retrySubmission(params) {
    if (await (0, ops_service_1.isKillSwitchEnabled)("lender_transmission")) {
        throw new errors_1.AppError("ops_kill_switch", "Lender transmissions are currently disabled.", 423);
    }
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const submission = await (0, lender_repo_1.findSubmissionById)(params.submissionId, client);
        if (!submission) {
            throw new errors_1.AppError("not_found", "Submission not found.", 404);
        }
        if (submission.status === "submitted") {
            await client.query("commit");
            return { id: submission.id, status: submission.status, retryStatus: "already_submitted" };
        }
        const retryState = await (0, lender_repo_1.findSubmissionRetryState)(submission.id, client);
        const attemptCount = retryState?.attempt_count ?? 0;
        const maxRetries = (0, config_1.getLenderRetryMaxCount)();
        if (attemptCount >= maxRetries) {
            throw new errors_1.AppError("retry_exhausted", "Retry limit reached.", 409);
        }
        if (!submission.payload || typeof submission.payload !== "object") {
            throw new errors_1.AppError("invalid_payload", "Submission payload is missing.", 409);
        }
        const result = await retryExistingSubmission({
            submissionId: submission.id,
            applicationId: submission.application_id,
            lenderId: submission.lender_id,
            payload: submission.payload,
            actorUserId: params.actorUserId,
            ip: params.ip,
            userAgent: params.userAgent,
            attempt: attemptCount + 1,
            client,
        });
        const status = result.value.status;
        const retryStatus = status === "submitted" ? "succeeded" : "pending";
        await (0, lender_repo_1.upsertSubmissionRetryState)({
            submissionId: submission.id,
            status: retryStatus,
            attemptCount: attemptCount + 1,
            nextAttemptAt: retryStatus === "pending" ? calculateNextAttempt(attemptCount + 1) : null,
            lastError: status === "submitted" ? null : "retry_failed",
            canceledAt: null,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "lender_submission_retried",
            actorUserId: params.actorUserId,
            targetUserId: null,
            targetType: "submission",
            targetId: submission.id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: status === "submitted",
            client,
        });
        await client.query("commit");
        return { id: submission.id, status: result.value.status, retryStatus };
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
async function cancelSubmissionRetry(params) {
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const submission = await (0, lender_repo_1.findSubmissionById)(params.submissionId, client);
        if (!submission) {
            throw new errors_1.AppError("not_found", "Submission not found.", 404);
        }
        const retryState = await (0, lender_repo_1.findSubmissionRetryState)(submission.id, client);
        if (!retryState) {
            throw new errors_1.AppError("not_found", "Retry state not found.", 404);
        }
        await (0, lender_repo_1.upsertSubmissionRetryState)({
            submissionId: submission.id,
            status: "canceled",
            attemptCount: retryState.attempt_count,
            nextAttemptAt: null,
            lastError: retryState.last_error,
            canceledAt: new Date(),
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
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
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
