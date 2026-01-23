import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../middleware/errors";
import {
  otpRateLimit,
  refreshRateLimit,
  resetOtpRateLimit,
} from "../../middleware/rateLimit";
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

function respondOk<T>(res: Response, data: T, status = 200): void {
  const requestId = getAuthRequestId(res);
  res.status(status).json({
    ok: true,
    data,
    error: null,
    requestId,
  });
}

function respondError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const requestId = getAuthRequestId(res);
  res.status(status).json({
    ok: false,
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
    requestId,
  });
}

function respondRequestValidationError(
  res: Response,
  route: string,
  requestId: string,
  errors: unknown
): void {
  logError("auth_request_validation_failed", {
    route,
    requestId,
    errors,
  });

  res.status(400).json({
    ok: false,
    data: null,
    error: {
      code: "validation_error",
      message: "Invalid request payload",
      details: errors,
    },
    requestId,
  });
}

function respondResponseValidationError(
  res: Response,
  route: string,
  requestId: string,
  errors: unknown
): void {
  logError("auth_response_validation_failed", {
    route,
    requestId,
    errors,
  });

  res.status(500).json({
    ok: false,
    data: null,
    error: {
      code: "invalid_response_shape",
      message: "Invalid auth response shape",
    },
    requestId,
  });
}

/**
 * POST /api/auth/otp/start
 */
async function handleOtpStart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const route = "/api/auth/otp/start";
    const requestId = getAuthRequestId(res);

    const validation = validateStartOtp(req);
    if (!validation.success) {
      const body = req.body ?? {};
      if (Object.keys(body).length === 0) {
        res.status(204).send();
        return;
      }

      respondRequestValidationError(
        res,
        route,
        requestId,
        validation.error.flatten()
      );
      return;
    }

    const { phone } = req.body as { phone: string };
    await startOtp(phone);

    const responseBody = { sent: true };
    const responseValidation =
      startOtpResponseSchema.safeParse(responseBody);

    if (!responseValidation.success) {
      respondResponseValidationError(
        res,
        route,
        requestId,
        responseValidation.error.flatten()
      );
      return;
    }

    respondOk(res, responseBody);
  } catch (err) {
    if (err instanceof AppError) {
      const details = (err as { details?: unknown }).details;
      respondError(res, err.status, err.code, err.message, details);
      return;
    }

    next(err);
  }
}

router.post("/otp/start", otpRateLimit(), handleOtpStart);

/**
 * POST /api/auth/otp/verify
 */
router.post("/otp/verify", otpRateLimit(), async (req, res, next) => {
  try {
    const route = "/api/auth/otp/verify";
    const requestId = getAuthRequestId(res);

    const validation = validateVerifyOtp(req);
    if (!validation.success) {
      respondRequestValidationError(
        res,
        route,
        requestId,
        validation.error.flatten()
      );
      return;
    }

    const { phone, code } = req.body as { phone: string; code: string };

    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route,
      method: req.method,
    });

    if (!result.ok) {
      respondError(res, result.status, result.error.code, result.error.message);
      return;
    }

    const accessToken = result.token;
    if (!accessToken) {
      throw new Error("OTP verified but accessToken missing");
    }

    const responseBody = {
      ok: true,
      accessToken,
      user: result.user,
    };

    const responseValidation =
      verifyOtpResponseSchema.safeParse(responseBody);

    if (!responseValidation.success) {
      respondResponseValidationError(
        res,
        route,
        requestId,
        responseValidation.error.flatten()
      );
      return;
    }

    resetOtpRateLimit(phone);

    res.status(200).json(responseBody);
  } catch (err) {
    if (err instanceof AppError) {
      const details = (err as { details?: unknown }).details;
      respondError(res, err.status, err.code, err.message, details);
      return;
    }

    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  respondOk(res, { ok: true });
});

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", refreshRateLimit(), async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};

    const result = await refreshSession({
      refreshToken,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (!result.ok) {
      respondError(
        res,
        result.status,
        result.error.code,
        result.error.message
      );
      return;
    }

    res.status(200).json({
      ok: true,
      accessToken: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    if (err instanceof AppError) {
      const details = (err as { details?: unknown }).details;
      respondError(res, err.status, err.code, err.message, details);
      return;
    }

    next(err);
  }
});

export default router;
