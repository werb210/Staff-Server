import { Router } from "express";
import smsRouter from "./sms.routes";
import chatRouter from "./chat.routes";
import { VoiceService } from "./voice.service";
import { voiceLogSchema } from "./communications.validators";
import { requireAuth } from "../middleware/requireAuth";
import { BadRequest } from "../errors";

const router = Router();
const voiceService = new VoiceService();

router.use("/sms", smsRouter);
router.use("/chat", chatRouter);

router.post("/voice/log", requireAuth, async (req, res, next) => {
  try {
    const payload = voiceLogSchema.parse(req.body);

    if (!payload.applicationId || !payload.phoneNumber || !payload.eventType) {
      throw new BadRequest("invalid voice payload");
    }

    const record = await voiceService.logEvent({
      applicationId: payload.applicationId,
      phoneNumber: payload.phoneNumber,
      eventType: payload.eventType,
      durationSeconds: payload.durationSeconds,
    });
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

export default router;
