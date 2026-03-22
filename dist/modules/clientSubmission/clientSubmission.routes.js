"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../../db");
const config_1 = require("../../config");
const errors_1 = require("../../middleware/errors");
const rateLimit_1 = require("../../middleware/rateLimit");
const clientSubmission_service_1 = require("./clientSubmission.service");
const pipelineState_1 = require("../applications/pipelineState");
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
const quickSubmissionSchema = zod_1.z.object({
    business_name: zod_1.z.string().min(1),
    requested_amount: zod_1.z.number().positive(),
    lender_id: zod_1.z.string().uuid(),
    product_id: zod_1.z.string().uuid(),
});
router.post("/submissions", (0, rateLimit_1.clientSubmissionRateLimit)(), async (req, res, next) => {
    const quickParsed = quickSubmissionSchema.safeParse(req.body);
    if (quickParsed.success) {
        const { business_name, requested_amount, lender_id, product_id } = quickParsed.data;
        try {
            const applicationId = (0, crypto_1.randomUUID)();
            const ownerUserId = (0, config_1.getClientSubmissionOwnerUserId)();
            await db_1.pool.query(`insert into applications
          (id, owner_user_id, name, metadata, product_type, pipeline_state, status, lender_id, lender_product_id, requested_amount, source, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())`, [
                applicationId,
                ownerUserId,
                business_name,
                null,
                "standard",
                pipelineState_1.ApplicationStage.RECEIVED,
                pipelineState_1.ApplicationStage.RECEIVED,
                lender_id,
                product_id,
                requested_amount,
                "client",
            ]);
            res.json({ ok: true, id: applicationId });
            return;
        }
        catch (err) {
            next(err);
            return;
        }
    }
    try {
        if (!req.body) {
            throw new errors_1.AppError("invalid_payload", "Payload is required.", 400);
        }
        const result = await (0, clientSubmission_service_1.submitClientApplication)({
            payload: req.body,
            ...buildRequestMetadata(req),
        });
        res.status(result.status).json({ submission: result.value, idempotent: result.idempotent });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
