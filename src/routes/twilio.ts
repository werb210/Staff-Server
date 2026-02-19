import { Router } from "express";
import jwt from "jsonwebtoken";
import AccessToken from "twilio/lib/jwt/AccessToken";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { logger } from "../lib/logger";

const router = Router();

const REQUIRED_TWILIO_ENV = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_TWIML_APP_SID",
  "TWILIO_PHONE_NUMBER",
] as const;

const { VoiceGrant } = AccessToken;

function requireTwilioEnv(name: (typeof REQUIRED_TWILIO_ENV)[number]): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function resolveIdentity(req: { user?: { userId?: string | null }; get: (name: string) => string | undefined }): string {
  const fromUser = req.user?.userId;
  if (typeof fromUser === "string" && fromUser.trim()) {
    return fromUser.trim();
  }

  const authHeader = req.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const encoded = authHeader.slice(7).trim();
    const decoded = jwt.decode(encoded);
    if (decoded && typeof decoded === "object") {
      const candidates = [decoded.sub, (decoded as { userId?: unknown }).userId];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
  }

  return "portal-user";
}

router.get("/token", (req, res) => {
  const accountSid = requireTwilioEnv("TWILIO_ACCOUNT_SID");
  const apiKey = requireTwilioEnv("TWILIO_API_KEY");
  const apiSecret = requireTwilioEnv("TWILIO_API_SECRET");
  const twimlAppSid = requireTwilioEnv("TWILIO_TWIML_APP_SID");

  const identity = resolveIdentity(req);
  const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
  });
  token.addGrant(voiceGrant);

  logger.info({ identity }, "Twilio token issued");
  res.status(200).json({ token: token.toJwt() });
});

router.post("/voice", (req, res) => {
  const voiceResponse = new VoiceResponse();
  const to = typeof req.body?.To === "string" ? req.body.To.trim() : "";

  if (to) {
    const callerId = requireTwilioEnv("TWILIO_PHONE_NUMBER");
    const dial = voiceResponse.dial({ callerId });
    dial.number(to);
  }

  res.type("text/xml");
  res.status(200).send(voiceResponse.toString());
});

router.post("/status", (req, res) => {
  const payload = req.body ?? {};
  const callSid = typeof payload.CallSid === "string" ? payload.CallSid : "";
  const callStatus = typeof payload.CallStatus === "string" ? payload.CallStatus : "";
  const direction = typeof payload.Direction === "string" ? payload.Direction : "";

  logger.info({
    CallSid: callSid,
    CallStatus: callStatus,
    Direction: direction,
  }, "Twilio status callback");

  res.sendStatus(200);
});

export const TWILIO_REQUIRED_ENV = REQUIRED_TWILIO_ENV;
export default router;
