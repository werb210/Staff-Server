import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../middleware/errors";
import { otpRateLimit, refreshRateLimit, resetOtpRateLimit } from "../../middleware/rateLimit";
import { getRequestId } from "../../middleware/requestContext";
import { logError } from "../../observability/logger";
import { refreshSession } from "./auth.service";
import { startOtp, verifyOtpCode } from "./otp.service";
import {
  startOtpResponseSchema,
  validateStartOtp,
  validateVerifyOtp,
  verifyOtpResponseSchema,
} from "../../validation/auth.validation";

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

function respondAuthValidationError(
  res: Response,
  route: string,
  requestId: string,
  errors: unknown
): Response {
  logError("auth_request_validation_failed", {
    route,
    requestId,
    errors,
  });
  return res.status(400).json({
    error: "validation_error",
    details: errors,
  });
}

function respondAuthResponseValidationError(
  res: Response,
  route: string,
  requestId: string,
  errors: unknown
): Response {
  logError("auth_response_validation_failed", {
    route,
    requestId,
    errors,
  });
  return res.status(500).json({
    error: "Invalid auth response shape",
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

async function handleOtpStart(req: Request, res: Response, next: NextFunction) {
  try {
    const route = "/api/auth/otp/start";
    const requestId = getAuthRequestId(res);
    const requestValidation = validateStartOtp(req);
    if (!requestValidation.success) {
      const body = req.body ?? {};
      if (Object.keys(body).length === 0) {
        return res.status(204).send();
      }
      return respondAuthValidationError(
        res,
        route,
        requestId,
        requestValidation.error.flatten()
      );
    }

    const { phone } = req.body ?? {};
    await startOtp(phone);

    const responseBody = { sent: true };
    const responseValidation = startOtpResponseSchema.safeParse(responseBody);
    if (!responseValidation.success) {
      return respondAuthResponseValidationError(
        res,
        route,
        requestId,
        responseValidation.error.flatten()
      );
    }

    return respondAuthOk(res, responseBody);
  } catch (err) {
    if (err instanceof AppError) {
      return respondAuthError(res, err.status, err.code, err.message);
    }
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
}

router.post("/otp/start", otpRateLimit(), handleOtpStart);

router.post("/otp/verify", otpRateLimit(), async (req, res) => {
  try {
    const route = "/api/auth/otp/verify";
    const requestId = getAuthRequestId(res);

    const requestValidation = validateVerifyOtp(req);
    if (!requestValidation.success) {
      return respondAuthValidationError(
        res,
        route,
        requestId,
        requestValidation.error.flatten()
      );
    }

    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route,
      method: req.method,
    });

    const responseBody = {
      ok: true,
      accessToken: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
    };

    const responseValidation = verifyOtpResponseSchema.safeParse(responseBody);
    if (!responseValidation.success) {
      return respondAuthResponseValidationError(
        res,
        route,
        requestId,
        responseValidation.error.flatten()
      );
    }

    if (typeof phone === "string") {
      resetOtpRateLimit(phone);
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    if (err instanceof AppError) {
      return respondAuthError(res, err.status, err.code, err.message);
    }
    if (isTwilioAuthError(err)) {
      return respondAuthError(
        res,
        401,
        "twilio_verify_failed",
        "Invalid Twilio credentials"
      );
    }
    return respondAuthError(
      res,
      502,
      "service_unavailable",
      "Authentication service unavailable."
    );
  }
});

router.post("/logout", (_req, res) => {
  return res.status(200).json({ ok: true });
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
      ok: true,
      accessToken: result.token,
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

export default router;
