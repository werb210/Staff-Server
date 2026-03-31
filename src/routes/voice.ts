import express from "express";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

const router = express.Router();

// inbound call webhook
router.post("/incoming", (_req, res) => {
  const voiceResponse = new VoiceResponse();

  voiceResponse.say("Connecting you to Maya.");
  voiceResponse.dial().client("maya-agent");

  res.type("text/xml");
  res.send(voiceResponse.toString());
});

export default router;
