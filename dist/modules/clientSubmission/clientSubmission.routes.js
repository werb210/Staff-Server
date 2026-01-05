"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const rateLimit_1 = require("../../middleware/rateLimit");
const clientSubmission_service_1 = require("./clientSubmission.service");
const router = (0, express_1.Router)();
router.post("/submissions", (0, rateLimit_1.clientSubmissionRateLimit)(), async (req, res, next) => {
    try {
        if (!req.body) {
            throw new errors_1.AppError("invalid_payload", "Payload is required.", 400);
        }
        const result = await (0, clientSubmission_service_1.submitClientApplication)({
            payload: req.body,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.status(result.status).json({ submission: result.value, idempotent: result.idempotent });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
