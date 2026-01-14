import { Router, type NextFunction, type Response } from "express";
import { AppError } from "../../middleware/errors";
import {
  otpRateLimit,
  refreshRateLimit,
} from "../../middleware/rateLimit";
import requireAuth, { requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { safeHandler } from "../../middleware/safeHandler";
import {
  startOtp,
  verifyOtpCode,
  refreshSession,
  logoutUser,
  logoutAll,
} from "./auth.service";

const router = Router();

const isTwilioAuthError = (err: unknown): err is { code: number } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 20003
  );
};

function handleTwilioAuthError(
  err: unknown,
  res: Response,
  next: NextFunction
) {
  if (isTwilioAuthError(err)) {
    return res.status(401).json({
      code: "twilio_verify_failed",
      message: "Invalid Twilio credentials",
    });
  }
  return next(err);
}

router.post("/otp/start", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const result = await startOtp(phone);
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.twilioCode !== undefined
          ? { twilioCode: result.twilioCode }
          : {}),
      });
    }
    res.status(204).send();
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/start", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const result = await startOtp(phone);
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.twilioCode !== undefined
          ? { twilioCode: result.twilioCode }
          : {}),
      });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/otp/verify", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: "/api/auth/otp/verify",
      method: req.method,
    });
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.twilioCode !== undefined
          ? { twilioCode: result.twilioCode }
          : {}),
      });
    }
    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/verify", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: "/api/auth/verify",
      method: req.method,
    });
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.twilioCode !== undefined
          ? { twilioCode: result.twilioCode }
          : {}),
      });
    }
    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/refresh", refreshRateLimit(), async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      throw new AppError("missing_token", "Refresh token is required.", 400);
    }
    const session = await refreshSession(
      refreshToken,
      req.ip,
      req.get("user-agent")
    );
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/logout",
  requireAuth,
  requireCapability([CAPABILITIES.AUTH_SESSION]),
  safeHandler(async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      throw new AppError("missing_token", "Refresh token is required.", 400);
    }
    if (!req.user) {
      throw new AppError(
        "missing_token",
        "Authorization token is required.",
        401
      );
    }
    await logoutUser({
      userId: req.user.userId,
      refreshToken,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  })
);

router.post(
  "/logout-all",
  requireAuth,
  requireCapability([CAPABILITIES.AUTH_SESSION]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(
        "missing_token",
        "Authorization token is required.",
        401
      );
    }
    await logoutAll({
      userId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  requireAuth,
  safeHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(
        "missing_token",
        "Authorization token is required.",
        401
      );
    }
    res.json({
      userId: req.user.userId,
      role: req.user.role,
      phone: req.user.phone,
    });
  })
);

export default router;
