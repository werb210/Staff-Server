import express from "express";
import { storeOtp, verifyOtp } from "../auth/otpService";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

function getSessionCookieDomain(): string | undefined {
  return isProduction ? ".boreal.financial" : undefined;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/otp/start", async (req, res) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    return res.status(400).json({ message: "Missing phone" });
  }

  const otp = generateOtp();

  try {
    await storeOtp(phone, otp);

    return res.status(200).json({
      success: true,
      ...(isProduction ? {} : { otp }),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send OTP",
    });
  }
});

router.post("/otp/verify", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone || !code) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const result = await verifyOtp(phone, code);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    res.cookie("session", "valid", {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      domain: getSessionCookieDomain(),
    });

    return res.status(200).json({ user: { id: "1" } });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to verify OTP",
    });
  }
});

export default router;
