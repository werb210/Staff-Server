import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../middleware/errors";
import { otpRateLimit, refreshRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/auth";
import { getCapabilitiesForRole } from "../../auth/capabilities";
import { isRole } from "../../auth/roles";
import { safeHandler } from "../../middleware/safeHandler";
import { getRequestId } from "../../middleware/requestContext";
import {
  startOtp,
  verifyOtpCode,
  refreshSession,
} from "./auth.service";

const router = Router();

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

async function handleOtpStart(req: Request, res: Response, next: NextFunction) {
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
}

router.post("/otp/start", otpRateLimit(), handleOtpStart);

router.post("/otp/verify", otpRateLimit(), async (req, res) => {
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
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    return res.status(200).json({
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
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

router.post("/refresh", refreshRateLimit(), async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    const result = await refreshSession({
      refreshToken,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    if (!result.ok) {
      return respondAuthError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
    }
    return res.status(200).json({
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
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
      req.user.capabilities ??
      (role && isRole(role) ? getCapabilitiesForRole(role) : []);
    respondAuthOk(res, {
      userId: req.user.userId,
      role,
      phone: req.user.phone,
      capabilities,
    });
  })
);

export default router;
