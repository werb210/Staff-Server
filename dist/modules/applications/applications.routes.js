"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const applications_service_1 = require("./applications.service");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const rateLimit_1 = require("../../middleware/rateLimit");
const router = (0, express_1.Router)();
router.post("/", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.APPLICATION_CREATE]), async (req, res, next) => {
    try {
        const { name, metadata, productType, idempotencyKey } = req.body ?? {};
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        if (!name || typeof name !== "string") {
            throw new errors_1.AppError("missing_fields", "Name is required.", 400);
        }
        const result = await (0, applications_service_1.createApplicationForUser)({
            ownerUserId: req.user.userId,
            name,
            metadata: metadata ?? null,
            productType: productType ?? null,
            idempotencyKey: idempotencyKey ?? null,
            actorUserId: req.user.userId,
            actorRole: req.user.role,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.status(result.status).json({ application: result.value });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/documents", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_UPLOAD]), (0, rateLimit_1.documentUploadRateLimit)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { title, metadata, content, documentId, documentType, idempotencyKey } = req.body ?? {};
        if (!title || !metadata || !content) {
            throw new errors_1.AppError("missing_fields", "title, metadata, and content are required.", 400);
        }
        const result = await (0, applications_service_1.uploadDocument)({
            applicationId: req.params.id,
            documentId: documentId ?? null,
            title,
            documentType: documentType ?? null,
            metadata,
            content,
            idempotencyKey: idempotencyKey ?? null,
            actorUserId: req.user.userId,
            actorRole: req.user.role,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.status(result.status).json({ document: result.value });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/pipeline", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.PIPELINE_MANAGE]), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { state, override } = req.body ?? {};
        if (!state || typeof state !== "string") {
            throw new errors_1.AppError("missing_fields", "state is required.", 400);
        }
        if (override && !req.user.capabilities.includes(capabilities_1.CAPABILITIES.PIPELINE_OVERRIDE)) {
            throw new errors_1.AppError("forbidden", "Override not permitted.", 403);
        }
        await (0, applications_service_1.changePipelineState)({
            applicationId: req.params.id,
            nextState: state,
            actorUserId: req.user.userId,
            actorRole: req.user.role,
            allowOverride: Boolean(override),
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/documents/:documentId/versions/:versionId/accept", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_REVIEW]), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, applications_service_1.acceptDocumentVersion)({
            applicationId: req.params.id,
            documentId: req.params.documentId,
            documentVersionId: req.params.versionId,
            actorUserId: req.user.userId,
            actorRole: req.user.role,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/documents/:documentId/versions/:versionId/reject", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.DOCUMENT_REVIEW]), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, applications_service_1.rejectDocumentVersion)({
            applicationId: req.params.id,
            documentId: req.params.documentId,
            documentVersionId: req.params.versionId,
            actorUserId: req.user.userId,
            actorRole: req.user.role,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
