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
import { getRequestId } from "../../middleware/requestContext";
import {
  startOtp,
  verifyOtpCode,
  createOtpSession,
  refreshSession,
  logoutUser,
  logoutAll,
} from "./auth.service";

const router = Router();

const REFRESH_TOKEN_COOKIE_NAMES = ["refreshToken", "refresh_token"];

function getAuthRequestId(res: Response): string {
  return res.locals.requestId ?? getRequestId() ?? "unknown";
}

function sanitizeAuthStatus(status: number): number {
  if (status >= 500) {
    return 503;
  }
  return status;
}

function respondAuthOk<T>(res: Response, data: T, status = 200): Response {
  const requestId = getAuthRequestId(res);
  return res.status(status).json({
    ok: true,
    data,
    error: null,
    requestId,
  });
}

function respondAuthError(
  res: Response,
  status: number,
  code: string,
  message: string
): Response {
  const requestId = getAuthRequestId(res);
  return res.status(sanitizeAuthStatus(status)).json({
    ok: false,
    data: null,
    error: { code, message },
    requestId,
  });
}

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
    return respondAuthError(
      res,
      401,
      "twilio_verify_failed",
      "Invalid Twilio credentials"
    );
  }
  return next(err);
}

router.post("/otp/start", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const result = await startOtp(phone);
    if (!result.ok) {
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    return respondAuthOk(res, { sent: true });
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/start", otpRateLimit(), async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const result = await startOtp(phone);
    if (!result.ok) {
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    return respondAuthOk(res, { sent: true });
  } catch (err) {
    handleTwilioAuthError(err, res, next);
  }
});

router.post("/otp/verify", otpRateLimit(), async (req, res) => {
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    if (authenticatedUser) {
      return respondAuthOk(res, { alreadyVerified: true });
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
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    if ("alreadyVerified" in result) {
      return respondAuthOk(res, { alreadyVerified: true });
    }
    return respondAuthOk(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return respondAuthError(res, err.status, err.code, err.message);
    }
    return respondAuthError(
      res,
      502,
      "service_unavailable",
      "Authentication service unavailable."
    );
  }
});

router.post(
  "/session",
  safeHandler(async (req, res) => {
    const { phone } = req.body ?? {};
    const result = await createOtpSession({
      phone,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    if (!result.ok) {
      respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
      return;
    }
    res.cookie("accessToken", result.accessToken, { httpOnly: true });
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true });
    res.status(200).json({ ok: true });
  })
);

router.post("/verify", otpRateLimit(), async (req, res) => {
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    if (authenticatedUser) {
      return respondAuthOk(res, { alreadyVerified: true });
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
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    if ("alreadyVerified" in result) {
      return respondAuthOk(res, { alreadyVerified: true });
    }
    return respondAuthOk(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return respondAuthError(res, err.status, err.code, err.message);
    }
    return respondAuthError(
      res,
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
      return respondAuthError(
        res,
        400,
        "missing_token",
        "Refresh token is required."
      );
    }
    const session = await refreshSession(
      refreshToken,
      req.ip,
      req.get("user-agent")
    );
    return respondAuthOk(res, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
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
      respondAuthError(
        res,
        400,
        "missing_token",
        "Refresh token is required."
      );
      return;
    }
    if (!req.user) {
      respondAuthError(
        res,
        401,
        "missing_token",
        "Authorization token is required."
      );
      return;
    }
    await logoutUser({
      userId: req.user.userId,
      refreshToken,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    respondAuthOk(res, { loggedOut: true });
  })
);

router.post(
  "/logout-all",
  requireAuth,
  requireCapability([CAPABILITIES.AUTH_SESSION]),
  safeHandler(async (req, res) => {
    if (!req.user) {
      respondAuthError(
        res,
        401,
        "missing_token",
        "Authorization token is required."
      );
      return;
    }
    await logoutAll({
      userId: req.user.userId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    respondAuthOk(res, { loggedOut: true });
  })
);

router.get(
  "/me",
  requireAuth,
  safeHandler(async (req, res) => {
    if (!req.user) {
      respondAuthError(
        res,
        401,
        "missing_token",
        "Authorization token is required."
      );
      return;
    }
    const role = req.user.role;
    const capabilities =
      req.user.capabilities ?? (role ? getCapabilitiesForRole(role) : []);
    respondAuthOk(res, {
      userId: req.user.userId,
      role,
      phone: req.user.phone,
      capabilities,
    });
  })
);

export default router;
