import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../middleware/errors";
import {
  otpRateLimit,
  refreshRateLimit,
} from "../../middleware/rateLimit";
import requireAuth, {
  getAuthenticatedUserFromRequest,
  requireCapability,
} from "../../middleware/auth";
import { CAPABILITIES, getCapabilitiesForRole } from "../../auth/capabilities";
import { safeHandler } from "../../middleware/safeHandler";
import { respondOk } from "../../utils/respondOk";
import { getRequestId } from "../../middleware/requestContext";
import {
  startOtp,
  verifyOtpCode,
  refreshSession,
  logoutUser,
  logoutAll,
} from "./auth.service";

const router = Router();

const REFRESH_TOKEN_COOKIE_NAMES = ["refreshToken", "refresh_token"];

function getCookieValue(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }
  const parts = header.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const [key, ...valueParts] = part.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

function getRefreshTokenCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  for (const name of REFRESH_TOKEN_COOKIE_NAMES) {
    const value = getCookieValue(header, name);
    if (value) {
      return value;
    }
  }
  return undefined;
}

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

router.post("/otp/verify", otpRateLimit(), async (req, res) => {
  const requestId = res.locals.requestId ?? getRequestId() ?? "unknown";
  const respondOtpError = (
    status: number,
    code: string,
    message: string
  ): Response => {
    return res.status(status).json({
      ok: false,
      error: { code, message },
      requestId,
    });
  };
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    if (authenticatedUser) {
      return respondOk(res, { alreadyVerified: true });
    }
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      refreshToken: getRefreshTokenCookie(req),
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: "/api/auth/otp/verify",
      method: req.method,
    });
    if (!result.ok) {
      return respondOtpError(
        result.status,
        result.error.code,
        result.error.message
      );
    }
    if ("alreadyVerified" in result) {
      return respondOk(res, { alreadyVerified: true });
    }
    return respondOk(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return respondOtpError(err.status, err.code, err.message);
    }
    return respondOtpError(
      502,
      "service_unavailable",
      "Authentication service unavailable."
    );
  }
});

router.post("/verify", otpRateLimit(), async (req, res) => {
  const requestId = res.locals.requestId ?? getRequestId() ?? "unknown";
  const respondOtpError = (
    status: number,
    code: string,
    message: string
  ): Response => {
    return res.status(status).json({
      ok: false,
      error: { code, message },
      requestId,
    });
  };
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    if (authenticatedUser) {
      return respondOk(res, { alreadyVerified: true });
    }
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      refreshToken: getRefreshTokenCookie(req),
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: "/api/auth/verify",
      method: req.method,
    });
    if (!result.ok) {
      return respondOtpError(
        result.status,
        result.error.code,
        result.error.message
      );
    }
    if ("alreadyVerified" in result) {
      return respondOk(res, { alreadyVerified: true });
    }
    return respondOk(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return respondOtpError(err.status, err.code, err.message);
    }
    return respondOtpError(
      502,
      "service_unavailable",
      "Authentication service unavailable."
    );
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
    const role = req.user.role;
    const capabilities =
      req.user.capabilities ?? (role ? getCapabilitiesForRole(role) : []);
    respondOk(res, {
      userId: req.user.userId,
      role,
      phone: req.user.phone,
      capabilities,
    });
  })
);

export default router;
