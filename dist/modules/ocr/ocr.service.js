"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueOcrForDocument = enqueueOcrForDocument;
exports.enqueueOcrForApplication = enqueueOcrForApplication;
exports.getOcrJobStatus = getOcrJobStatus;
exports.getOcrResult = getOcrResult;
exports.retryOcrJob = retryOcrJob;
exports.processOcrJob = processOcrJob;
const errors_1 = require("../../middleware/errors");
const audit_service_1 = require("../audit/audit.service");
const config_1 = require("../../config");
const applications_repo_1 = require("../applications/applications.repo");
const ocr_repo_1 = require("./ocr.repo");
const ocr_provider_1 = require("./ocr.provider");
const ocr_storage_1 = require("./ocr.storage");
const OCR_RETRY_BASE_MS = 1000;
const OCR_RETRY_MAX_MS = 15 * 60 * 1000;
function resolveProvider() {
    const provider = (0, config_1.getOcrProvider)();
    if (provider === "openai") {
        return (0, ocr_provider_1.createOpenAiOcrProvider)();
    }
    throw new Error(`unsupported_ocr_provider:${provider}`);
}
function parseMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") {
        throw new Error("missing_document_metadata");
    }
    const record = metadata;
    if (!record.mimeType || typeof record.mimeType !== "string") {
        throw new Error("missing_document_mime_type");
    }
    return {
        mimeType: record.mimeType,
        fileName: typeof record.fileName === "string" ? record.fileName : undefined,
    };
}
function computeNextAttempt(attemptCount, maxAttempts) {
    const nextAttempt = attemptCount + 1;
    if (nextAttempt >= maxAttempts) {
        return null;
    }
    const delay = Math.min(OCR_RETRY_BASE_MS * 2 ** attemptCount, OCR_RETRY_MAX_MS);
    return new Date(Date.now() + delay);
}
async function enqueueOcrForDocument(documentId) {
    const document = await (0, applications_repo_1.findDocumentById)(documentId);
    if (!document) {
        throw new errors_1.AppError("not_found", "Document not found.", 404);
    }
    return (0, ocr_repo_1.createOcrJob)({
        documentId: document.id,
        applicationId: document.application_id,
        maxAttempts: (0, config_1.getOcrMaxAttempts)(),
    });
}
async function enqueueOcrForApplication(applicationId) {
    const application = await (0, applications_repo_1.findApplicationById)(applicationId);
    if (!application) {
        throw new errors_1.AppError("not_found", "Application not found.", 404);
    }
    const documents = await (0, applications_repo_1.listDocumentsByApplicationId)(applicationId);
    const jobs = [];
    for (const document of documents) {
        const job = await (0, ocr_repo_1.createOcrJob)({
            documentId: document.id,
            applicationId: document.application_id,
            maxAttempts: (0, config_1.getOcrMaxAttempts)(),
        });
        jobs.push(job);
    }
    return jobs;
}
async function getOcrJobStatus(documentId) {
    return (0, ocr_repo_1.findOcrJobByDocumentId)(documentId);
}
async function getOcrResult(documentId) {
    return (0, ocr_repo_1.findOcrResultByDocumentId)(documentId);
}
async function retryOcrJob(documentId) {
    const job = await (0, ocr_repo_1.findOcrJobByDocumentId)(documentId);
    if (!job) {
        return enqueueOcrForDocument(documentId);
    }
    const updated = await (0, ocr_repo_1.resetOcrJob)({ jobId: job.id });
    if (!updated) {
        throw new errors_1.AppError("not_found", "OCR job not found.", 404);
    }
    return updated;
}
async function processOcrJob(job, options) {
    const provider = options?.provider ?? resolveProvider();
    const storage = options?.storage ?? (0, ocr_storage_1.createOcrStorage)();
    const maxAttempts = Number.isFinite(job.max_attempts) && job.max_attempts > 0
        ? job.max_attempts
        : (0, config_1.getOcrMaxAttempts)();
    try {
        const document = await (0, applications_repo_1.findDocumentById)(job.document_id);
        if (!document) {
            throw new Error("document_not_found");
        }
        const version = await (0, applications_repo_1.findActiveDocumentVersion)({ documentId: document.id });
        if (!version) {
            throw new Error("document_version_missing");
        }
        const { mimeType, fileName } = parseMetadata(version.metadata);
        const buffer = await storage.getBuffer({ content: version.content });
        const result = await provider.extract({ buffer, mimeType, fileName });
        await (0, ocr_repo_1.markOcrJobSuccess)({
            jobId: job.id,
            documentId: job.document_id,
            provider: result.provider,
            model: result.model,
            extractedText: result.text,
            extractedJson: result.json,
            meta: result.meta,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "unknown_error";
        if (error instanceof ocr_storage_1.OcrStorageValidationError) {
            console.error("ocr_storage_url_rejected", {
                code: "ocr_storage_url_rejected",
                jobId: job.id,
                documentId: job.document_id,
                url: error.url,
            });
            try {
                await (0, audit_service_1.recordAuditEvent)({
                    action: "ocr_storage_url_rejected",
                    actorUserId: null,
                    targetUserId: null,
                    targetType: "ocr_job",
                    targetId: job.id,
                    success: false,
                });
            }
            catch (auditError) {
                console.error("ocr_storage_url_audit_failed", {
                    code: "ocr_storage_url_audit_failed",
                    jobId: job.id,
                    error: auditError instanceof Error ? auditError.message : "unknown_error",
                });
            }
        }
        const attemptCount = job.attempt_count + 1;
        const status = attemptCount >= maxAttempts ? "canceled" : "failed";
        const nextAttemptAt = status === "canceled" ? null : computeNextAttempt(job.attempt_count, maxAttempts);
        await (0, ocr_repo_1.markOcrJobFailure)({
            jobId: job.id,
            attemptCount,
            status,
            lastError: message,
            nextAttemptAt,
            maxAttempts,
        });
    }
}
