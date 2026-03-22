"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const db_1 = require("../db");
const applications_repo_1 = require("../modules/applications/applications.repo");
const config_1 = require("../config");
const router = (0, express_1.Router)();
const createApplicationSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    source: zod_1.z.string().trim().optional(),
});
router.get("/update", async (_req, res) => {
    res.status(200).json({ ok: true });
});
router.post("/update", async (_req, res) => {
    res.status(200).json({ ok: true });
});
router.post("/", async (req, res, next) => {
    try {
        const { sessionId, source } = createApplicationSchema.parse(req.body ?? {});
        const mapped = await db_1.db.query(`select application_id from readiness_application_mappings where readiness_session_id = $1 limit 1`, [sessionId]);
        if (mapped.rows[0]?.application_id) {
            res.status(200).json({ success: true, applicationId: mapped.rows[0].application_id, reused: true });
            return;
        }
        const session = await db_1.db.query(`select id, crm_lead_id, company_name, full_name, email, phone, industry, years_in_business,
              monthly_revenue, annual_revenue, ar_outstanding, existing_debt
       from readiness_sessions where id = $1 limit 1`, [sessionId]);
        const readiness = session.rows[0];
        if (!readiness) {
            res.status(404).json({ success: false, error: "readiness_session_not_found" });
            return;
        }
        const created = await (0, applications_repo_1.createApplication)({
            ownerUserId: (0, config_1.getClientSubmissionOwnerUserId)(),
            name: readiness.company_name,
            metadata: {
                readinessSessionId: readiness.id,
                crmLeadId: readiness.crm_lead_id,
                readiness: {
                    fullName: readiness.full_name,
                    email: readiness.email,
                    phone: readiness.phone,
                    industry: readiness.industry,
                    yearsInBusiness: readiness.years_in_business,
                    monthlyRevenue: readiness.monthly_revenue,
                    annualRevenue: readiness.annual_revenue,
                    arOutstanding: readiness.ar_outstanding,
                    existingDebt: readiness.existing_debt,
                },
            },
            productType: "standard",
            productCategory: "standard",
            source: source ?? "readiness_continuation",
        });
        await db_1.db.query(`insert into readiness_application_mappings (id, readiness_session_id, application_id)
       values ($1, $2, $3)
       on conflict (readiness_session_id) do nothing`, [(0, crypto_1.randomUUID)(), readiness.id, created.id]);
        await db_1.db.query(`update readiness_sessions
       set converted_application_id = $2, is_active = false, updated_at = now()
       where id = $1`, [readiness.id, created.id]);
        res.status(201).json({ success: true, applicationId: created.id, leadId: readiness.crm_lead_id, reused: false });
    }
    catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            res.status(400).json({ success: false, error: "invalid_payload" });
            return;
        }
        res.status(500).json({ success: false, error: "server_error" });
    }
});
exports.default = router;
