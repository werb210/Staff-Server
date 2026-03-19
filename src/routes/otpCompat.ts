import { Router } from "express";
import { storeOtp, verifyOtp } from "../auth/otpService";

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

type SessionRequest = {
  session?: {
    user?: unknown;
    [key: string]: unknown;
  };
};

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/api/auth/otp/start", async (req, res) => {
  const { phone } = (req.body ?? {}) as { phone?: string };

  if (!phone) {
    return res.status(400).json({ ok: false, error: "phone required" });
  }

  const otp = generateOtp();

  try {
    await storeOtp(phone, otp);

    return res.json({
      ok: true,
      data: { message: "OTP sent", ...(isProduction ? {} : { otp }) },
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : "Invalid phone number format",
    });
  }
});

router.post("/api/auth/otp/verify", async (req, res) => {
  const { phone, code } = (req.body ?? {}) as { phone?: string; code?: string };

  if (!phone) {
    return res.status(400).json({ ok: false, error: "phone required" });
  }

  if (!code) {
    return res.status(400).json({ ok: false, error: "code required" });
  }

  try {
    const result = await verifyOtp(phone, code);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    const sessionRequest = req as unknown as SessionRequest;
    sessionRequest.session = sessionRequest.session || {};
    sessionRequest.session.user = { verified: true };

    return res.json({
      ok: true,
      data: { verified: true },
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : "Invalid phone number format",
    });
  }
});

export default router;
