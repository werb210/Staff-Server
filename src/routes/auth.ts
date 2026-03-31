import { Router } from "express";
import rateLimit from "express-rate-limit";
import { twilioClient, verifyServiceSid } from "../lib/twilioClient";

const router = Router();

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// SEND OTP (Twilio Verify ONLY)
router.post("/send-otp", sendLimiter, async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ error: "phone required" });

  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({ status: verification.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// VERIFY OTP (Twilio Verify ONLY)
router.post("/verify-otp", verifyLimiter, async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: "phone and code required" });
  }

  try {
    const check = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return res.status(401).json({ success: false });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
