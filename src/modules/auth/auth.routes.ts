import { Router } from "express";
import { AppError } from "../../middleware/errors";
import {
  otpRateLimit,
  refreshRateLimit,
} from "../../middleware/rateLimit";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import {
  startOtp,
  verifyOtpCode,
  refreshSession,
  logoutUser,
  logoutAll,
} from "./auth.service";

const router = Router();

router.post("/otp/start", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const result = await startOtp(phone);
    if (!result.ok) {
      return res.status(result.status).json({
        code: result.code,
        message: result.message,
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
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
  async (req, res, next) => {
    try {
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
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/logout-all",
  requireAuth,
  requireCapability([CAPABILITIES.AUTH_SESSION]),
  async (req, res, next) => {
    try {
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
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/me",
  requireAuth,
  requireCapability([CAPABILITIES.AUTH_SESSION]),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          "missing_token",
          "Authorization token is required.",
          401
        );
      }
      res.json({
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.capabilities,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
