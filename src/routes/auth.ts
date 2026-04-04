import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

import { getEnv } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { twilioClient, twilioEnabled, verifyServiceSid } from "../lib/twilioClient";
import { fail, ok } from "../lib/response";

const router = Router();

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

export function resetOtpStateForTests() {
  // Twilio Verify owns OTP state in production; nothing to clear in process.
}

router.post("/otp/start", sendLimiter, async (req, res) => {
  const { phone } = req.body;

  if (!phone) return fail(res, "phone_required");
  if (!twilioEnabled || !twilioClient) {
    return fail(res, "twilio_not_configured", 503);
  }

  const client = twilioClient;

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return ok(res, { sid: verification.sid });
  } catch (err: any) {
    console.error("❌ TWILIO ERROR:", {
      message: err.message,
      code: err.code,
      moreInfo: err.moreInfo,
    });

    return fail(res, "twilio_verify_failure");
  }
});

router.post("/otp/verify", verifyLimiter, async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return fail(res, "phone_and_code_required");
  }
  if (!twilioEnabled || !twilioClient) {
    return fail(res, "twilio_not_configured", 503);
  }

  try {
    const check = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return fail(res, "otp_invalid", 401);
    }

    const { JWT_SECRET } = getEnv();
    const token = jwt.sign(
      { phone },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return ok(res, {
      verified: true,
      token,
    });
  } catch (err: any) {
    console.error("❌ TWILIO VERIFY CHECK ERROR:", {
      message: err.message,
      code: err.code,
      moreInfo: err.moreInfo,
    });

    return fail(res, "twilio_verify_failure");
  }
});

router.get("/me", requireAuth, (req, res) => {
  return ok(res, { user: req.user ?? null });
});

router.post("/logout", (_req, res) => {
  return ok(res, { loggedOut: true });
});

export default router;
