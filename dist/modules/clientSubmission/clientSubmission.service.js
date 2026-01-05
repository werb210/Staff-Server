"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitClientApplication = submitClientApplication;
const errors_1 = require("../../middleware/errors");
const db_1 = require("../../db");
const applications_repo_1 = require("../applications/applications.repo");
const audit_service_1 = require("../audit/audit.service");
const documentRequirements_1 = require("../applications/documentRequirements");
const config_1 = require("../../config");
const clientSubmission_repo_1 = require("./clientSubmission.repo");
function assertObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new errors_1.AppError("invalid_payload", `${label} is required.`, 400);
    }
}
function assertExactKeys(record, keys, label) {
    const actual = Object.keys(record).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new errors_1.AppError("invalid_payload", `${label} has invalid fields.`, 400);
    }
}
function assertString(value, label) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new errors_1.AppError("invalid_payload", `${label} is required.`, 400);
    }
    return value;
}
function assertDocuments(value) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new errors_1.AppError("invalid_payload", "documents are required.", 400);
    }
    return value.map((entry, index) => {
        assertObject(entry, `documents[${index}]`);
        assertExactKeys(entry, ["title", "documentType", "metadata", "content"], `documents[${index}]`);
        const title = assertString(entry.title, `documents[${index}].title`);
        const documentType = assertString(entry.documentType, `documents[${index}].documentType`);
        const content = assertString(entry.content, `documents[${index}].content`);
        assertObject(entry.metadata, `documents[${index}].metadata`);
        assertExactKeys(entry.metadata, ["fileName", "mimeType", "size"], `documents[${index}].metadata`);
        const fileName = assertString(entry.metadata.fileName, `documents[${index}].metadata.fileName`);
        const mimeType = assertString(entry.metadata.mimeType, `documents[${index}].metadata.mimeType`);
        const sizeValue = entry.metadata.size;
        if (typeof sizeValue !== "number" || Number.isNaN(sizeValue) || sizeValue <= 0) {
            throw new errors_1.AppError("invalid_payload", `documents[${index}].metadata.size is invalid.`, 400);
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
function assertPayload(payload) {
    assertObject(payload, "payload");
    assertExactKeys(payload, ["submissionKey", "productType", "business", "applicant", "documents"], "payload");
    const submissionKey = assertString(payload.submissionKey, "submissionKey");
    const productType = assertString(payload.productType, "productType");
    assertObject(payload.business, "business");
    assertExactKeys(payload.business, ["legalName", "taxId", "entityType", "address"], "business");
    const legalName = assertString(payload.business.legalName, "business.legalName");
    const taxId = assertString(payload.business.taxId, "business.taxId");
    const entityType = assertString(payload.business.entityType, "business.entityType");
    assertObject(payload.business.address, "business.address");
    assertExactKeys(payload.business.address, ["line1", "city", "state", "postalCode", "country"], "business.address");
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
function enforceDocumentRules(productType, documents) {
    if (!(0, documentRequirements_1.isSupportedProductType)(productType)) {
        throw new errors_1.AppError("invalid_product", "Unsupported product type.", 400);
    }
    const requirements = (0, documentRequirements_1.getRequirements)({ productType, pipelineState: "NEW" });
    const allowedTypes = new Set((0, documentRequirements_1.getAllowedDocumentTypes)(productType));
    const counts = new Map();
    documents.forEach((doc) => {
        if (!allowedTypes.has(doc.documentType)) {
            throw new errors_1.AppError("invalid_document_type", "Document type is not allowed.", 400);
        }
        if (!(0, documentRequirements_1.getDocumentCategory)(productType, doc.documentType)) {
            throw new errors_1.AppError("invalid_document_type", "Document type is not mapped.", 400);
        }
        counts.set(doc.documentType, (counts.get(doc.documentType) ?? 0) + 1);
    });
    for (const requirement of requirements) {
        const count = counts.get(requirement.documentType) ?? 0;
        if (requirement.required && count === 0) {
            throw new errors_1.AppError("missing_documents", "Required documents are missing.", 400);
        }
        if (!requirement.multipleAllowed && count > 1) {
            throw new errors_1.AppError("document_duplicate", "Multiple documents are not allowed for this type.", 400);
        }
    }
}
function enforceDocumentMetadata(documents) {
    const allowed = (0, config_1.getDocumentAllowedMimeTypes)();
    const maxSize = (0, config_1.getDocumentMaxSizeBytes)();
    for (const doc of documents) {
        if (!allowed.includes(doc.metadata.mimeType)) {
            throw new errors_1.AppError("invalid_mime_type", "Unsupported document MIME type.", 400);
        }
        if (doc.metadata.size > maxSize) {
            throw new errors_1.AppError("document_too_large", "Document exceeds max size.", 400);
        }
    }
}
async function submitClientApplication(params) {
    const submission = assertPayload(params.payload);
    enforceDocumentRules(submission.productType, submission.documents);
    enforceDocumentMetadata(submission.documents);
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const existing = await (0, clientSubmission_repo_1.findClientSubmissionByKey)(submission.submissionKey, client);
        if (existing) {
            await (0, audit_service_1.recordAuditEvent)({
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
        const ownerUserId = (0, config_1.getClientSubmissionOwnerUserId)();
        const application = await (0, applications_repo_1.createApplication)({
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
            const document = await (0, applications_repo_1.createDocument)({
                applicationId: application.id,
                ownerUserId,
                title: doc.title,
                documentType: doc.documentType,
                client,
            });
            await (0, applications_repo_1.createDocumentVersion)({
                documentId: document.id,
                version: 1,
                metadata: doc.metadata,
                content: doc.content,
                client,
            });
            await (0, audit_service_1.recordAuditEvent)({
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
        await (0, clientSubmission_repo_1.createClientSubmission)({
            submissionKey: submission.submissionKey,
            applicationId: application.id,
            payload: submission,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
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
    }
    catch (err) {
        await client.query("rollback");
        await (0, audit_service_1.recordAuditEvent)({
            action: "client_submission_failed",
            actorUserId: null,
            targetUserId: null,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw err;
    }
    finally {
        client.release();
    }
}
