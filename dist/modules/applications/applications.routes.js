"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const applications_service_1 = require("./applications.service");
const applications_controller_1 = require("./applications.controller");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const roles_1 = require("../../auth/roles");
const rateLimit_1 = require("../../middleware/rateLimit");
const safeHandler_1 = require("../../middleware/safeHandler");
const logger_1 = require("../../observability/logger");
const toStringSafe_1 = require("../../utils/toStringSafe");
const router = (0, express_1.Router)();
function buildRequestMetadata(req) {
    const metadata = {};
    if (req.ip) {
        metadata.ip = req.ip;
    }
    const userAgent = req.get("user-agent");
    if (userAgent) {
        metadata.userAgent = userAgent;
    }
    return metadata;
}
router.post("/", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.APPLICATION_CREATE]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    try {
        const { name, metadata, productType } = req.body ?? {};
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        if (!name || typeof name !== "string") {
            throw new errors_1.AppError("missing_fields", "Name is required.", 400);
        }
        const role = req.user.role;
        if (!role || !(0, roles_1.isRole)(role)) {
            throw (0, errors_1.forbiddenError)();
        }
        const createPayload = {
            ownerUserId: req.user.userId,
            name,
            metadata: metadata ?? null,
            productType: productType ?? null,
            actorUserId: req.user.userId,
            actorRole: role,
            ...buildRequestMetadata(req),
        };
        const result = await (0, applications_service_1.createApplicationForUser)(createPayload);
        res.status(result.status).json({ application: result.value });
    }
    catch (err) {
        (0, logger_1.logError)("applications_create_failed", {
            error: err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
        });
        throw err;
    }
}));
router.get("/:id/processing-status", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.APPLICATION_READ]), (0, safeHandler_1.safeHandler)(applications_controller_1.getApplicationProcessingStatus));
router.get("/:id/documents", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.APPLICATION_READ]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !(0, roles_1.isRole)(role)) {
        throw (0, errors_1.forbiddenError)();
    }
    const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
    if (!applicationId) {
        throw new errors_1.AppError("validation_error", "application id is required.", 400);
    }
    const documents = await (0, applications_service_1.listDocumentsForApplication)({
        applicationId,
        actorUserId: req.user.userId,
        actorRole: role,
    });
    res.status(200).json({ documents });
}));
router.post("/:id/open", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.APPLICATION_READ]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !(0, roles_1.isRole)(role)) {
        throw (0, errors_1.forbiddenError)();
    }
    const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
    if (!applicationId) {
        throw new errors_1.AppError("validation_error", "application id is required.", 400);
    }
    const openPayload = {
        applicationId,
        actorUserId: req.user.userId,
        actorRole: role,
        ...buildRequestMetadata(req),
    };
    await (0, applications_service_1.openApplicationForStaff)(openPayload);
    res.status(200).json({ ok: true });
}));
router.post("/:id/documents", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_UPLOAD]), (0, rateLimit_1.documentUploadRateLimit)(), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { title, metadata, content, documentId, documentType } = req.body ?? {};
        if (!title || !metadata || !content) {
            throw new errors_1.AppError("missing_fields", "title, metadata, and content are required.", 400);
        }
        const role = req.user.role;
        if (!role || !(0, roles_1.isRole)(role)) {
            throw (0, errors_1.forbiddenError)();
        }
        const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
        if (!applicationId) {
            throw new errors_1.AppError("validation_error", "application id is required.", 400);
        }
        const uploadPayload = {
            applicationId,
            documentId: documentId ?? null,
            title,
            documentType: documentType ?? null,
            metadata,
            content,
            actorUserId: req.user.userId,
            actorRole: role,
            ...buildRequestMetadata(req),
        };
        const result = await (0, applications_service_1.uploadDocument)(uploadPayload);
        res.status(result.status).json({ document: result.value });
    }
    catch (err) {
        (0, logger_1.logError)("applications_upload_failed", {
            error: err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
        });
        throw err;
    }
}));
router.delete("/:id/documents/:documentId", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_REVIEW]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
    }
    const role = req.user.role;
    if (!role || !(0, roles_1.isRole)(role)) {
        throw (0, errors_1.forbiddenError)();
    }
    const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
    const documentId = (0, toStringSafe_1.toStringSafe)(req.params.documentId);
    if (!applicationId || !documentId) {
        throw new errors_1.AppError("validation_error", "application id is required.", 400);
    }
    const removePayload = {
        applicationId,
        documentId,
        actorUserId: req.user.userId,
        actorRole: role,
        ...buildRequestMetadata(req),
    };
    await (0, applications_service_1.removeDocument)(removePayload);
    res.status(200).json({ ok: true });
}));
router.post("/:id/pipeline", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.PIPELINE_MANAGE]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { state, override } = req.body ?? {};
        if (!state || typeof state !== "string") {
            throw new errors_1.AppError("missing_fields", "state is required.", 400);
        }
        const role = req.user.role;
        if (!role || !(0, roles_1.isRole)(role)) {
            throw (0, errors_1.forbiddenError)();
        }
        const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
        if (!applicationId) {
            throw new errors_1.AppError("validation_error", "application id is required.", 400);
        }
        const changePayload = {
            applicationId,
            nextState: state,
            override: override === true,
            actorUserId: req.user.userId,
            actorRole: role,
            ...buildRequestMetadata(req),
        };
        await (0, applications_service_1.changePipelineState)(changePayload);
        res.json({ ok: true });
    }
    catch (err) {
        (0, logger_1.logError)("applications_pipeline_change_failed", {
            error: err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
        });
        throw err;
    }
}));
router.post("/:id/documents/:documentId/versions/:versionId/accept", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_REVIEW]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const role = req.user.role;
        if (!role || !(0, roles_1.isRole)(role)) {
            throw (0, errors_1.forbiddenError)();
        }
        const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
        const documentId = (0, toStringSafe_1.toStringSafe)(req.params.documentId);
        const documentVersionId = (0, toStringSafe_1.toStringSafe)(req.params.versionId);
        if (!applicationId || !documentId || !documentVersionId) {
            throw new errors_1.AppError("validation_error", "application id is required.", 400);
        }
        const acceptPayload = {
            applicationId,
            documentId,
            documentVersionId,
            actorUserId: req.user.userId,
            actorRole: role,
            ...buildRequestMetadata(req),
        };
        await (0, applications_service_1.acceptDocumentVersion)(acceptPayload);
        res.json({ ok: true });
    }
    catch (err) {
        (0, logger_1.logError)("applications_document_accept_failed", {
            error: err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
        });
        throw err;
    }
}));
router.post("/:id/documents/:documentId/versions/:versionId/reject", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_REVIEW]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const role = req.user.role;
        if (!role || !(0, roles_1.isRole)(role)) {
            throw (0, errors_1.forbiddenError)();
        }
        const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.id);
        const documentId = (0, toStringSafe_1.toStringSafe)(req.params.documentId);
        const documentVersionId = (0, toStringSafe_1.toStringSafe)(req.params.versionId);
        if (!applicationId || !documentId || !documentVersionId) {
            throw new errors_1.AppError("validation_error", "application id is required.", 400);
        }
        const rejectPayload = {
            applicationId,
            documentId,
            documentVersionId,
            actorUserId: req.user.userId,
            actorRole: role,
            ...buildRequestMetadata(req),
        };
        await (0, applications_service_1.rejectDocumentVersion)(rejectPayload);
        res.json({ ok: true });
    }
    catch (err) {
        (0, logger_1.logError)("applications_document_reject_failed", {
            error: err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
        });
        throw err;
    }
}));
exports.default = router;
