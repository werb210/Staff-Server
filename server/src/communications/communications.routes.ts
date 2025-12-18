import { Router } from "express";
import smsRouter from "./sms.routes";
import chatRouter from "./chat.routes";
import { VoiceService } from "./voice.service";
import { voiceLogSchema } from "./communications.validators";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const voiceService = new VoiceService();

router.use("/sms", smsRouter);
router.use("/chat", chatRouter);

router.post("/voice/log", requireAuth, async (req, res, next) => {
  try {
    const parsed = voiceLogSchema.parse(req.body);

    if (!parsed.applicationId || !parsed.phoneNumber || !parsed.eventType) {
      return res
        .status(400)
        .json({ error: "applicationId, phoneNumber, and eventType are required" });
    }

    const payload: Parameters<(typeof voiceService)["logEvent"]>[0] = {
      applicationId: parsed.applicationId,
      phoneNumber: parsed.phoneNumber,
      eventType: parsed.eventType,
      durationSeconds: parsed.durationSeconds,
    };

    const record = await voiceService.logEvent(payload);
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

export default router;
