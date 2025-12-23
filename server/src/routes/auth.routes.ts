import { Router } from "express";
import {
  sendVerificationCode,
  checkVerificationCode,
  twilioConfigured,
} from "../services/twilio.service";

const router = Router();

router.post("/send-code", async (req, res) => {
  if (!twilioConfigured) {
    return res.status(500).json({ error: "Twilio not configured" });
  }

  const { phone } = req.body;
  await sendVerificationCode(phone);
  res.json({ ok: true });
});

router.post("/verify-code", async (req, res) => {
  const { phone, code } = req.body;
  const result = await checkVerificationCode(phone, code);
  res.json(result);
});

export default router;
