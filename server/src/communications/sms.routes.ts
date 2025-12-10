import { Router } from "express";
import { smsInboundSchema, smsSendSchema } from "./communications.validators";
import { SmsService } from "./sms.service";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const smsService = new SmsService();

router.post("/inbound", async (req, res, next) => {
  try {
    const payload = smsInboundSchema.parse(req.body);
    const record = await smsService.handleInbound(payload);
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

router.post("/send", async (req, res, next) => {
  try {
    const payload = smsSendSchema.parse(req.body);
    const record = await smsService.sendSms(payload.applicationId, payload.to, payload.body, payload.from);
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

router.get("/thread/:applicationId", async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const records = await smsService.thread(applicationId);
    res.json({ ok: true, records });
  } catch (err) {
    next(err);
  }
});

router.get("/messages/:applicationId", async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const records = await smsService.listMessages(applicationId);
    res.json({ ok: true, records });
  } catch (err) {
    next(err);
  }
});

export default router;
