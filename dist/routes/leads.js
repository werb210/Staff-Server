"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const capabilities_1 = require("../auth/capabilities");
const crm_service_1 = require("../modules/crm/crm.service");
const router = (0, express_1.Router)();
router.post("/", async (req, res, next) => {
    try {
        const source = typeof req.body?.source === "string" ? req.body.source.trim() : "";
        if (!source) {
            res.status(400).json({ message: "source is required" });
            return;
        }
        const lead = await (0, crm_service_1.createCrmLead)({
            companyName: req.body?.companyName ?? "",
            fullName: req.body?.fullName ?? "",
            email: req.body?.email ?? "",
            phone: req.body?.phone ?? "",
            yearsInBusiness: req.body?.yearsInBusiness,
            annualRevenue: req.body?.annualRevenue,
            monthlyRevenue: req.body?.monthlyRevenue,
            requestedAmount: req.body?.requestedAmount,
            creditScoreRange: req.body?.creditScoreRange,
            productInterest: req.body?.productInterest,
            industryInterest: req.body?.industryInterest,
            source,
            notes: req.body?.notes,
            tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
        });
        res.status(201).json(lead);
    }
    catch (_err) {
        res.status(500).json({ message: "Failed to create lead" });
    }
});
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.CRM_READ]));
router.get("/", async (_req, res) => {
    try {
        const leads = await (0, crm_service_1.listCrmLeads)();
        res.json(leads);
    }
    catch (_err) {
        res.status(500).json({ message: "Failed to fetch leads" });
    }
});
exports.default = router;
