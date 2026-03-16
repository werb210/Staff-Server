import { Router } from "express";
import rateLimit from "express-rate-limit";
import { startOtp, verifyOtpCode } from "../../modules/auth/otp.service";
import {
  otpVerifyLimiter,
  resetOtpRateLimit,
} from "../../middleware/rateLimit";
import {
  startOtpSchema,
  verifyOtpSchema,
} from "../../validation/auth.validation";

const router = Router();
const OTP_START_REUSE_WINDOW_MS = 60 * 1000;
const recentOtpStarts = new Map<string, number>();
const activeVerifications = new Map<string, boolean>();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

function hasRecentOtpStart(phone: string): boolean {
  const now = Date.now();
  const expiresAt = recentOtpStarts.get(phone);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= now) {
    recentOtpStarts.delete(phone);
    return false;
  }
  return true;
}

function markRecentOtpStart(phone: string): void {
  recentOtpStarts.set(phone, Date.now() + OTP_START_REUSE_WINDOW_MS);
}

router.post("/start", otpLimiter, async (req, res, next) => {
  try {
    const parsed = startOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const { phone } = parsed.data;
    const reused = hasRecentOtpStart(phone);
    let otpSessionId: string | null = null;

    if (!reused) {
      const otpResult = await startOtp(phone);
      otpSessionId = otpResult.sid;
      markRecentOtpStart(phone);
    }

    return res.status(200).json({
      otpSessionId: otpSessionId ?? "reused",
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/verify", otpVerifyLimiter(), async (req, res, next) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    req.log?.warn({
      event: "otp_verify_validation_failed",
      body: req.body,
      errors: parsed.error.flatten(),
    });

    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten(),
    });
  }

  const { phone, code, otpSessionId, email } = parsed.data;

  if (activeVerifications.get(phone)) {
    return res.status(429).json({
      success: false,
      error: "Verification already in progress",
    });
  }

  activeVerifications.set(phone, true);

  try {
    req.log?.info({
      event: "otp_verification_attempt",
      phone,
      otpSessionId,
    });

    const userAgent = req.get("user-agent");
    const route = req.originalUrl ?? req.url;
    const payload = {
      phone,
      code,
      otpSessionId,
      email,
      ...(req.ip ? { ip: req.ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      ...(route ? { route } : {}),
      ...(req.method ? { method: req.method } : {}),
    };
    const result = await verifyOtpCode(payload);
    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }
    resetOtpRateLimit(phone);
    return res.status(200).json({
      token: result.token,
      user: {
        id: result.user.id,
        role: result.user.role,
      },
    });
  } catch (err) {
    req.log?.error({
      event: "otp_verification_error",
      error: err,
    });

    return res.status(500).json({
      error: "OTP verification failed",
    });
  } finally {
    activeVerifications.delete(phone);
  }
});

export default router;
