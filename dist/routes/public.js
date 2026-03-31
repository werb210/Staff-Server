"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../validation");
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
    return res.json({ ok: true });
});
router.post("/lead", (0, validate_1.requireFields)(["companyName", "email"]), async (req, res, next) => {
    try {
        const result = await createLead(req.body);
        if (!result?.leadId) {
            return res.status(400).json({ error: "INVALID_INPUT" });
        }
        return res.json({ leadId: result.leadId });
    }
    catch (error) {
        return next(error);
    }
});
router.all("/lead", (_req, res) => {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
});
exports.default = router;
