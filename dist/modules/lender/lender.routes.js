"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const errors_1 = require("../../middleware/errors");
const lender_service_1 = require("./lender.service");
const rateLimit_1 = require("../../middleware/rateLimit");
const router = (0, express_1.Router)();
router.post("/submissions", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.LENDER_SUBMIT]), (0, rateLimit_1.lenderSubmissionRateLimit)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { applicationId, idempotencyKey, lenderId } = req.body ?? {};
        if (!applicationId) {
            throw new errors_1.AppError("missing_fields", "applicationId is required.", 400);
        }
        const submission = await (0, lender_service_1.submitApplication)({
            applicationId,
            idempotencyKey: idempotencyKey ?? null,
            lenderId: lenderId ?? "default",
            actorUserId: req.user.userId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.status(submission.statusCode).json({ submission: submission.value });
    }
    catch (err) {
        next(err);
    }
});
router.get("/submissions/:id", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.LENDER_SUBMIT]), async (req, res, next) => {
    try {
        const submission = await (0, lender_service_1.getSubmissionStatus)(req.params.id);
        res.json({ submission });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
