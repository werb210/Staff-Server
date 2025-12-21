"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communications_validators_1 = require("./communications.validators");
const sms_service_1 = require("./sms.service");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("../errors");
const router = (0, express_1.Router)();
const smsService = new sms_service_1.SmsService();
router.post("/inbound", async (req, res, next) => {
    try {
        const parsed = communications_validators_1.smsInboundSchema.parse(req.body);
        if (!parsed.From || !parsed.To || !parsed.Body) {
            throw new errors_1.BadRequest("invalid sms payload");
        }
        const record = await smsService.handleInbound({
            From: parsed.From,
            To: parsed.To,
            Body: parsed.Body,
            applicationId: parsed.applicationId,
        });
        res.json({ ok: true, record });
    }
    catch (err) {
        next(err);
    }
});
router.use(requireAuth_1.requireAuth);
router.post("/send", async (req, res, next) => {
    try {
        if (!smsService.isConfigured()) {
            return res.status(501).json({ error: "Twilio not configured" });
        }
        const parsed = communications_validators_1.smsSendSchema.parse(req.body);
        const payload = {
            applicationId: parsed.applicationId ?? null,
            to: parsed.to,
            body: parsed.body,
            from: parsed.from,
        };
        const record = await smsService.sendSms(payload.applicationId, payload.to, payload.body, payload.from);
        res.json({ ok: true, record });
    }
    catch (err) {
        next(err);
    }
});
router.get("/thread/:applicationId", async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const records = await smsService.thread(applicationId);
        res.json({ ok: true, records });
    }
    catch (err) {
        next(err);
    }
});
router.get("/messages/:applicationId", async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const records = await smsService.listMessages(applicationId);
        res.json({ ok: true, records });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
