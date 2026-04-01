"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../validation");
const response_1 = require("../lib/response");
const router = (0, express_1.Router)();
async function createLead(payload) {
    const normalizedPayload = {
        ...payload,
        businessName: payload.businessName ?? payload.companyName,
    };
    const parsed = validation_1.LeadSchema.safeParse(normalizedPayload ?? {});
    if (!parsed.success) {
        return {};
    }
    const data = parsed.data;
    const result = await (0, db_1.dbQuery)(`insert into crm_leads (email, phone, company_name, product_interest, requested_amount, source)
       values ($1, $2, $3, $4, $5, 'public_api')
       returning id`, [data.email, data.phone, data.businessName, data.productType, data.requestedAmount ?? null]);
    return { leadId: result.rows[0]?.id };
}
router.get("/test", (_req, res) => {
    return (0, response_1.ok)(res, { ok: true });
});
router.post("/lead", (0, validate_1.requireFields)(["companyName", "email"]), async (req, res, next) => {
    try {
        const result = await createLead(req.body);
        if (!result?.leadId) {
            return (0, response_1.fail)(res, 400, "INVALID_INPUT");
        }
        return (0, response_1.ok)(res, { leadId: result.leadId });
    }
    catch (error) {
        return next(error);
    }
});
router.all("/lead", (_req, res) => {
    return (0, response_1.fail)(res, 405, "METHOD_NOT_ALLOWED");
});
exports.default = router;
