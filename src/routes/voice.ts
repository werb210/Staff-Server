import express from "express";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { CallStatusSchema } from "../schemas";
import { ok } from "../lib/response";

const router = express.Router();

router.post("/incoming", (_req, res) => {
  const voiceResponse = new VoiceResponse();

  voiceResponse.say("Connecting you to Maya.");
  voiceResponse.dial().client("maya-agent");

  res.type("text/xml");
  res.send(voiceResponse.toString());
});

router.post("/status", requireAuth, validate(CallStatusSchema), (_req, res) => {
  return ok(res, { received: true });
});

export default router;
