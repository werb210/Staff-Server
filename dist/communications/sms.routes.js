import { Router } from "express";
import { smsInboundSchema, smsSendSchema } from "./communications.validators";
import { SmsService } from "./sms.service";
import { requireAuth } from "../middleware/requireAuth";
import { BadRequest } from "../errors";
const router = Router();
const smsService = new SmsService();
router.post("/inbound", async (req, res, next) => {
    try {
        const parsed = smsInboundSchema.parse(req.body);
        if (!parsed.From || !parsed.To || !parsed.Body) {
            throw new BadRequest("invalid sms payload");
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
router.use(requireAuth);
router.post("/send", async (req, res, next) => {
    try {
        if (!smsService.isConfigured()) {
            return res.status(501).json({ error: "Twilio not configured" });
        }
        const parsed = smsSendSchema.parse(req.body);
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
export default router;
