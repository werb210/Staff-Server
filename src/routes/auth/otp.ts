import { Router } from "express";
import { startOtp, verifyOtpCode } from "../../modules/auth/otp.service";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  resetOtpRateLimit,
} from "../../middleware/rateLimit";

const router = Router();

router.post("/start", otpSendLimiter(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    await startOtp(phone);
    const requestId = res.locals.requestId ?? "unknown";
    return res.json({
      ok: true,
      data: {
        sent: true,
      },
      error: null,
      requestId,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/verify", otpVerifyLimiter(), async (req, res, next) => {
  try {
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: req.originalUrl,
      method: req.method,
    });
    if (typeof phone === "string") {
      resetOtpRateLimit(phone);
    }
    return res.status(200).json({
      ok: true,
      token: result.token,
      user: {
        id: result.user.id,
        role: result.user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
