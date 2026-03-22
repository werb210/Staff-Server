"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const errors_1 = require("../../middleware/errors");
const lender_service_1 = require("./lender.service");
const rateLimit_1 = require("../../middleware/rateLimit");
const safeHandler_1 = require("../../middleware/safeHandler");
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
router.post("/submissions", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.LENDER_SUBMIT]), (0, rateLimit_1.lenderSubmissionRateLimit)(), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
    }
    const { applicationId, lenderId, lenderProductId, lender_product_id, skipRequiredDocuments, } = req.body ?? {};
    const resolvedLenderProductId = typeof lenderProductId === "string" ? lenderProductId : lender_product_id;
    if (typeof applicationId !== "string" || applicationId.trim().length === 0) {
        throw new errors_1.AppError("missing_fields", "applicationId is required.", 400);
    }
    if (typeof lenderId !== "string" || lenderId.trim().length === 0) {
        throw new errors_1.AppError("missing_fields", "lenderId is required.", 400);
    }
    if (typeof resolvedLenderProductId !== "string" ||
        resolvedLenderProductId.trim().length === 0) {
        throw new errors_1.AppError("missing_fields", "lenderProductId is required.", 400);
    }
    if (skipRequiredDocuments !== undefined &&
        skipRequiredDocuments !== null &&
        typeof skipRequiredDocuments !== "boolean") {
        throw new errors_1.AppError("validation_error", "skipRequiredDocuments must be a boolean.", 400);
    }
    const submission = await (0, lender_service_1.submitApplication)({
        applicationId,
        idempotencyKey: req.get("idempotency-key") ?? null,
        lenderId,
        lenderProductId: resolvedLenderProductId,
        actorUserId: req.user.userId,
        skipRequiredDocuments: Boolean(skipRequiredDocuments),
        ...buildRequestMetadata(req),
    });
    res.status(submission.statusCode).json({ submission: submission.value });
}));
router.get("/submissions/:id", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.LENDER_SUBMIT]), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    const submissionId = (0, toStringSafe_1.toStringSafe)(req.params.id);
    if (!submissionId) {
        throw new errors_1.AppError("validation_error", "submission id is required.", 400);
    }
    const submission = await (0, lender_service_1.getSubmissionStatus)(submissionId);
    res.json({ submission });
}));
exports.default = router;
