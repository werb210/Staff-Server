import type { Request, Response } from "express";
import { createRequire } from "node:module";
import { ok } from "../../lib/respond.js";

const _require = createRequire(import.meta.url);
const twilioSdk = _require("twilio");
const VoiceResponse = twilioSdk.twiml.VoiceResponse;

export function incomingCallHandler(_req: Request, res: Response): Response {
  const response = new VoiceResponse();

  const dial = response.dial();

  dial.client("staff");

  return ok(res, response.toString());
}
