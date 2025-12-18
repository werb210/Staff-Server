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
    const payload = voiceLogSchema.parse({
      applicationId: req.body.applicationId!,
      phoneNumber: req.body.phoneNumber!,
      eventType: req.body.eventType!,
      durationSeconds: req.body.durationSeconds ?? undefined,
    });
    const record = await voiceService.logEvent(payload);
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

export default router;
