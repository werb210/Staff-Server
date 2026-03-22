"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const errors_1 = require("../../middleware/errors");
const safeHandler_1 = require("../../middleware/safeHandler");
const rateLimit_1 = require("../../middleware/rateLimit");
const lenderSubmissions_service_1 = require("./lenderSubmissions.service");
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
router.post("/:applicationId/submit", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.LENDER_SUBMIT]), (0, rateLimit_1.lenderSubmissionRateLimit)(), (0, safeHandler_1.safeHandler)(async (req, res, next) => {
    if (!req.user) {
        throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
    }
    const applicationId = (0, toStringSafe_1.toStringSafe)(req.params.applicationId);
    if (!applicationId) {
        throw new errors_1.AppError("missing_fields", "applicationId is required.", 400);
    }
    const { skipRequiredDocuments } = req.body ?? {};
    if (skipRequiredDocuments !== undefined &&
        skipRequiredDocuments !== null &&
        typeof skipRequiredDocuments !== "boolean") {
        throw new errors_1.AppError("validation_error", "skipRequiredDocuments must be a boolean.", 400);
    }
    const submission = await (0, lenderSubmissions_service_1.submitLenderSubmission)({
        applicationId,
        idempotencyKey: req.get("idempotency-key") ?? null,
        actorUserId: req.user.userId,
        skipRequiredDocuments: Boolean(skipRequiredDocuments),
        ...buildRequestMetadata(req),
    });
    res.status(submission.statusCode).json({ submission: submission.value });
}));
exports.default = router;
