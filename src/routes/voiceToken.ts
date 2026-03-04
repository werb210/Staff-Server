import { Router } from "express";
import twilio from "twilio";

const router = Router();

router.get("/voice/token", (req, res) => {
  const identity = (req.query.identity as string) || "client";

  const AccessToken = (twilio as any).jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const apiKey = process.env.TWILIO_API_KEY!;
  const apiSecret = process.env.TWILIO_API_SECRET!;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;

  const token = new AccessToken(
    accountSid,
    apiKey,
    apiSecret,
    { identity }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true
  });

  token.addGrant(voiceGrant);

  res.json({
    identity,
    token: token.toJwt()
  });
});

export default router;
