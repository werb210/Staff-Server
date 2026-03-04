import { Router } from "express";
import twilio from "twilio";

const router = Router();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_TWIML_APP_SID,
} = process.env;

router.get("/voice/token", async (req, res) => {
  try {
    const identity = (req.query.identity as string) || "anonymous";

    const AccessToken = (twilio as any).jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID!,
      TWILIO_API_KEY!,
      TWILIO_API_SECRET!,
      { identity }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID!,
      incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    res.json({
      token: token.toJwt(),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate voice token",
    });
  }
});

export default router;
