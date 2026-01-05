"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lender_service_1 = require("./lender.service");
const errors_1 = require("../../middleware/errors");
const router = (0, express_1.Router)();
router.get("/applications/:id/transmission-status", async (req, res, next) => {
    try {
        const status = await (0, lender_service_1.getTransmissionStatus)(req.params.id);
        res.json({ transmission: status });
    }
    catch (err) {
        next(err);
    }
});
router.post("/transmissions/:id/retry", async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const result = await (0, lender_service_1.retrySubmission)({
            submissionId: req.params.id,
            actorUserId: req.user.userId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ retry: result });
    }
    catch (err) {
        next(err);
    }
});
router.post("/transmissions/:id/cancel", async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const result = await (0, lender_service_1.cancelSubmissionRetry)({
            submissionId: req.params.id,
            actorUserId: req.user.userId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ retry: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
