import express from "express";
import { sendOtp, verifyOtp } from "../auth/otpService";

const router = express.Router();

type SessionRequest = {
  session?: {
    user?: unknown;
    [key: string]: unknown;
  };
};

router.post("/otp/send", async (req, res) => {
  try {
    const { phone } = req.body;

    await sendOtp(phone);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[OTP SEND ERROR]", err);
    return res.status(500).json({ ok: false });
  }
});

router.post("/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;

    const result = await verifyOtp(phone, code);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    const sessionRequest = req as unknown as SessionRequest;
    sessionRequest.session = sessionRequest.session || {};
    sessionRequest.session.user = { phone };

    return res.json({ ok: true });
  } catch (err) {
    console.error("[OTP VERIFY ERROR]", err);
    return res.status(500).json({ ok: false });
  }
});

export default router;
