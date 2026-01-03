import { Router } from "express";
import { AppError } from "../../middleware/errors";
import {
  loginRateLimit,
  passwordResetRateLimit,
  refreshRateLimit,
} from "../../middleware/rateLimit";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ROLES } from "../../auth/roles";
import {
  confirmPasswordReset,
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  changePassword,
} from "./auth.service";

const router = Router();

router.post("/login", loginRateLimit(), async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      throw new AppError(
        "missing_credentials",
        "Email and password are required.",
        400
      );
    }

    const result = await loginUser(email, password, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", refreshRateLimit(), async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      throw new AppError(
        "missing_token",
        "Refresh token is required.",
        400
      );
    }
    const session = await refreshSession(refreshToken, req.ip);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      throw new AppError(
        "missing_token",
        "Refresh token is required.",
        400
      );
    }
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    await logoutUser({ userId: req.user.userId, refreshToken });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/password-reset/request",
  requireAuth,
  requireRole([ROLES.ADMIN, ROLES.STAFF]),
  passwordResetRateLimit(),
  async (req, res, next) => {
    try {
      const { userId } = req.body ?? {};
      if (!userId) {
        throw new AppError("missing_fields", "userId is required.", 400);
      }
      const token = await requestPasswordReset({
        userId,
        ip: req.ip,
      });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/password-reset/confirm",
  requireAuth,
  passwordResetRateLimit(),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body ?? {};
      if (!token || !newPassword) {
        throw new AppError(
          "missing_fields",
          "Token and newPassword are required.",
          400
        );
      }
      await confirmPasswordReset({
        token,
        newPassword,
        ip: req.ip,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/password-change", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      throw new AppError(
        "missing_fields",
        "currentPassword and newPassword are required.",
        400
      );
    }
    if (!req.user) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    await changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
