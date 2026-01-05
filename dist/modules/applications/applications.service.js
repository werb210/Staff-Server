"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionPipelineState = transitionPipelineState;
exports.createApplicationForUser = createApplicationForUser;
exports.uploadDocument = uploadDocument;
exports.changePipelineState = changePipelineState;
exports.acceptDocumentVersion = acceptDocumentVersion;
exports.rejectDocumentVersion = rejectDocumentVersion;
exports.getPipelineStates = getPipelineStates;
const errors_1 = require("../../middleware/errors");
const audit_service_1 = require("../audit/audit.service");
const applications_repo_1 = require("./applications.repo");
const db_1 = require("../../db");
const roles_1 = require("../../auth/roles");
const idempotency_repo_1 = require("../idempotency/idempotency.repo");
const documentRequirements_1 = require("./documentRequirements");
const pipelineState_1 = require("./pipelineState");
const config_1 = require("../../config");
const IDEMPOTENCY_SCOPE_APPLICATION = "application_create";
const IDEMPOTENCY_SCOPE_DOCUMENT = "document_upload";
function assertMetadata(value) {
    if (!value || typeof value !== "object") {
        throw new errors_1.AppError("invalid_metadata", "Metadata is required.", 400);
    }
    const record = value;
    if (typeof record.fileName !== "string" ||
        typeof record.mimeType !== "string" ||
        typeof record.size !== "number") {
        throw new errors_1.AppError("invalid_metadata", "Metadata is invalid.", 400);
    }
}
function validateDocumentMetadata(metadata) {
    const allowed = (0, config_1.getDocumentAllowedMimeTypes)();
    if (!allowed.includes(metadata.mimeType)) {
        throw new errors_1.AppError("invalid_mime_type", "Unsupported document MIME type.", 400);
    }
    const maxSize = (0, config_1.getDocumentMaxSizeBytes)();
    if (metadata.size > maxSize) {
        throw new errors_1.AppError("document_too_large", "Document exceeds max size.", 400);
    }
}
async function recordDocumentUploadFailure(params) {
    await (0, audit_service_1.recordAuditEvent)({
        action: "document_upload_rejected",
        actorUserId: params.actorUserId,
        targetUserId: params.targetUserId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client: params.client,
    });
}
function canAccessApplication(role, ownerUserId, actorId) {
    if (actorId === ownerUserId) {
        return true;
    }
    return role === roles_1.ROLES.ADMIN || role === roles_1.ROLES.STAFF;
}
async function transitionPipelineState(params) {
    const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, params.client);
    if (!application) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "pipeline_state_changed",
            actorUserId: params.actorUserId,
            targetUserId: null,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
            client: params.client,
        });
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    if (params.actorUserId && params.actorRole) {
        if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
            await (0, audit_service_1.recordAuditEvent)({
                action: "pipeline_state_changed",
                actorUserId: params.actorUserId,
                targetUserId: application.owner_user_id,
                ip: params.ip,
                userAgent: params.userAgent,
                success: false,
                client: params.client,
            });
            throw new errors_1.AppError("forbidden", "Not authorized.", 403);
        }
    }
    if (!(0, pipelineState_1.isPipelineState)(application.pipeline_state)) {
        throw new errors_1.AppError("invalid_state", "Pipeline state is invalid.", 400);
    }
    if (!(0, pipelineState_1.canTransition)(application.pipeline_state, params.nextState)) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "pipeline_state_changed",
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
            client: params.client,
        });
        throw new errors_1.AppError("invalid_transition", "Invalid pipeline transition.", 400);
    }
    await (0, applications_repo_1.updateApplicationPipelineState)({
        applicationId: params.applicationId,
        pipelineState: params.nextState,
        client: params.client,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "pipeline_state_changed",
        actorUserId: params.actorUserId,
        targetUserId: application.owner_user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client: params.client,
    });
    if (params.allowOverride) {
        await (0, audit_service_1.recordAuditEvent)({
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
async function evaluateRequirements(params) {
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
    let missingRequired = false;
    for (const requirement of requirements) {
        if (!requirement.required) {
            continue;
        }
        const latest = await (0, applications_repo_1.findLatestDocumentVersionStatus)({
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
async function createApplicationForUser(params) {
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        if (params.idempotencyKey && params.actorUserId) {
            const existing = await (0, idempotency_repo_1.findIdempotencyRecord)({
                actorUserId: params.actorUserId,
                scope: IDEMPOTENCY_SCOPE_APPLICATION,
                idempotencyKey: params.idempotencyKey,
                client,
            });
            if (existing) {
                await client.query("commit");
                return {
                    status: existing.status_code,
                    value: existing.response_body
                        .application,
                    idempotent: true,
                };
            }
        }
        const application = await (0, applications_repo_1.createApplication)({
            ownerUserId: params.ownerUserId,
            name: params.name,
            metadata: params.metadata,
            productType: params.productType ?? "standard",
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
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
            actorRole: params.actorRole ?? (params.actorUserId ? roles_1.ROLES.USER : null),
            ip: params.ip,
            userAgent: params.userAgent,
            client,
        });
        const updated = await (0, applications_repo_1.findApplicationById)(application.id, client);
        if (!updated) {
            throw new errors_1.AppError("not_found", "Application not found.", 404);
        }
        const response = {
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
            await (0, idempotency_repo_1.createIdempotencyRecord)({
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
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
async function uploadDocument(params) {
    assertMetadata(params.metadata);
    try {
        validateDocumentMetadata(params.metadata);
    }
    catch (err) {
        await recordDocumentUploadFailure({
            actorUserId: params.actorUserId,
            targetUserId: null,
            ip: params.ip,
            userAgent: params.userAgent,
        });
        throw err;
    }
    const application = await (0, applications_repo_1.findApplicationById)(params.applicationId);
    if (!application) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "document_uploaded",
            actorUserId: params.actorUserId,
            targetUserId: null,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "document_uploaded",
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("forbidden", "Not authorized.", 403);
    }
    if (!(0, documentRequirements_1.isSupportedProductType)(application.product_type)) {
        await recordDocumentUploadFailure({
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
        });
        throw new errors_1.AppError("invalid_product", "Unsupported product type.", 400);
    }
    const documentCategory = (0, documentRequirements_1.getDocumentCategory)(application.product_type, params.documentType ?? params.title);
    if (!documentCategory) {
        await recordDocumentUploadFailure({
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
        });
        throw new errors_1.AppError("invalid_document_type", "Document type is not allowed.", 400);
    }
    if (!(0, pipelineState_1.isPipelineState)(application.pipeline_state)) {
        throw new errors_1.AppError("invalid_state", "Pipeline state is invalid.", 400);
    }
    const requirements = (0, documentRequirements_1.getRequirements)({
        productType: application.product_type,
        pipelineState: application.pipeline_state,
    });
    const requirement = requirements.find((item) => item.documentType === (params.documentType ?? params.title));
    if (!requirement) {
        await recordDocumentUploadFailure({
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
        });
        throw new errors_1.AppError("invalid_document_type", "Document type is not allowed.", 400);
    }
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        if (params.idempotencyKey) {
            const existing = await (0, idempotency_repo_1.findIdempotencyRecord)({
                actorUserId: params.actorUserId,
                scope: IDEMPOTENCY_SCOPE_DOCUMENT,
                idempotencyKey: params.idempotencyKey,
                client,
            });
            if (existing) {
                await client.query("commit");
                return {
                    status: existing.status_code,
                    value: existing.response_body
                        .document,
                    idempotent: true,
                };
            }
        }
        let documentId = params.documentId ?? null;
        if (documentId) {
            const existingDoc = await (0, applications_repo_1.findDocumentById)(documentId, client);
            if (!existingDoc || existingDoc.application_id !== params.applicationId) {
                await client.query("rollback");
                throw new errors_1.AppError("not_found", "Document not found.", 404);
            }
            if (existingDoc.document_type !== (params.documentType ?? existingDoc.document_type)) {
                await recordDocumentUploadFailure({
                    actorUserId: params.actorUserId,
                    targetUserId: application.owner_user_id,
                    ip: params.ip,
                    userAgent: params.userAgent,
                    client,
                });
                throw new errors_1.AppError("document_type_mismatch", "Document type mismatch.", 400);
            }
            const accepted = await (0, applications_repo_1.findAcceptedDocumentVersion)({
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
                throw new errors_1.AppError("document_immutable", "Accepted document versions cannot be modified.", 409);
            }
        }
        else {
            if (!requirement.multipleAllowed) {
                const existing = await (0, applications_repo_1.findDocumentByApplicationAndType)({
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
                    throw new errors_1.AppError("document_duplicate", "Multiple documents are not allowed for this type.", 409);
                }
            }
            const doc = await (0, applications_repo_1.createDocument)({
                applicationId: params.applicationId,
                ownerUserId: application.owner_user_id,
                title: params.title,
                documentType: params.documentType ?? params.title,
                client,
            });
            documentId = doc.id;
        }
        const currentVersion = await (0, applications_repo_1.getLatestDocumentVersion)(documentId, client);
        const nextVersion = currentVersion + 1;
        if (nextVersion <= currentVersion) {
            await client.query("rollback");
            throw new errors_1.AppError("version_conflict", "Invalid document version.", 409);
        }
        const version = await (0, applications_repo_1.createDocumentVersion)({
            documentId,
            version: nextVersion,
            metadata: params.metadata,
            content: params.content,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "document_uploaded",
            actorUserId: params.actorUserId,
            targetUserId: application.owner_user_id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: true,
            client,
        });
        const response = {
            documentId,
            versionId: version.id,
            version: version.version,
        };
        if (params.idempotencyKey) {
            await (0, idempotency_repo_1.createIdempotencyRecord)({
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
    }
    catch (err) {
        try {
            await client.query("rollback");
        }
        catch {
            // ignore rollback
        }
        throw err;
    }
    finally {
        client.release();
    }
}
async function changePipelineState(params) {
    if (!(0, pipelineState_1.isPipelineState)(params.nextState)) {
        throw new errors_1.AppError("invalid_state", "Pipeline state is invalid.", 400);
    }
    const client = await db_1.pool.connect();
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
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
async function acceptDocumentVersion(params) {
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, client);
        if (!application) {
            throw new errors_1.AppError("not_found", "Application not found.", 404);
        }
        if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
            throw new errors_1.AppError("forbidden", "Not authorized.", 403);
        }
        if (application.pipeline_state !== "REQUIRES_DOCS" && application.pipeline_state !== "NEW") {
            throw new errors_1.AppError("invalid_state", "Documents can only be reviewed while in REQUIRES_DOCS.", 400);
        }
        const document = await (0, applications_repo_1.findDocumentById)(params.documentId, client);
        if (!document || document.application_id !== params.applicationId) {
            throw new errors_1.AppError("not_found", "Document not found.", 404);
        }
        const version = await (0, applications_repo_1.findDocumentVersionById)(params.documentVersionId, client);
        if (!version || version.document_id !== params.documentId) {
            throw new errors_1.AppError("not_found", "Document version not found.", 404);
        }
        const review = await (0, applications_repo_1.findDocumentVersionReview)(params.documentVersionId, client);
        if (review) {
            throw new errors_1.AppError("version_reviewed", "Document version already reviewed.", 409);
        }
        await (0, applications_repo_1.createDocumentVersionReview)({
            documentVersionId: params.documentVersionId,
            status: "accepted",
            reviewedByUserId: params.actorUserId,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
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
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
async function rejectDocumentVersion(params) {
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const application = await (0, applications_repo_1.findApplicationById)(params.applicationId, client);
        if (!application) {
            throw new errors_1.AppError("not_found", "Application not found.", 404);
        }
        if (!canAccessApplication(params.actorRole, application.owner_user_id, params.actorUserId)) {
            throw new errors_1.AppError("forbidden", "Not authorized.", 403);
        }
        if (application.pipeline_state !== "REQUIRES_DOCS" && application.pipeline_state !== "NEW") {
            throw new errors_1.AppError("invalid_state", "Documents can only be reviewed while in REQUIRES_DOCS.", 400);
        }
        const document = await (0, applications_repo_1.findDocumentById)(params.documentId, client);
        if (!document || document.application_id !== params.applicationId) {
            throw new errors_1.AppError("not_found", "Document not found.", 404);
        }
        const version = await (0, applications_repo_1.findDocumentVersionById)(params.documentVersionId, client);
        if (!version || version.document_id !== params.documentId) {
            throw new errors_1.AppError("not_found", "Document version not found.", 404);
        }
        const review = await (0, applications_repo_1.findDocumentVersionReview)(params.documentVersionId, client);
        if (review) {
            throw new errors_1.AppError("version_reviewed", "Document version already reviewed.", 409);
        }
        await (0, applications_repo_1.createDocumentVersionReview)({
            documentVersionId: params.documentVersionId,
            status: "rejected",
            reviewedByUserId: params.actorUserId,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
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
    }
    catch (err) {
        await client.query("rollback");
        throw err;
    }
    finally {
        client.release();
    }
}
function getPipelineStates() {
    return [...pipelineState_1.PIPELINE_STATES];
}
