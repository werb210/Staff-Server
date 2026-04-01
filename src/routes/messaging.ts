import { Router } from "express";
import { twilioClient, twilioEnabled, fromNumber, callerId } from "../lib/twilioClient";
import { fail, ok } from "../lib/response";

const router = Router();

// SMS
router.post("/sms", async (req, res) => {
  const { to, body } = req.body;

  if (!to || !body) return fail(res, 400, "to + body required");
  if (!twilioEnabled || !twilioClient) {
    return fail(res, 503, "twilio_not_configured");
  }

  try {
    const msg = await twilioClient.messages.create({
      to,
      from: fromNumber,
      body,
    });

    return ok(res, { sid: msg.sid });
  } catch (err: any) {
    return fail(res, 500, err?.message ?? "unknown_error");
  }
});

// CALL
router.post("/call", async (req, res) => {
  const { to, twimlUrl } = req.body;

  if (!to || !twimlUrl) {
    return fail(res, 400, "to + twimlUrl required");
  }
  if (!twilioEnabled || !twilioClient) {
    return fail(res, 503, "twilio_not_configured");
  }

  try {
    const call = await twilioClient.calls.create({
      to,
      from: callerId,
      url: twimlUrl,
    });

    return ok(res, { sid: call.sid });
  } catch (err: any) {
    return fail(res, 500, err?.message ?? "unknown_error");
  }
});

export default router;
