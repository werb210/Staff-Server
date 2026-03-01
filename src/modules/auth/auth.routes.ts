import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../../middleware/errors";
import {
  loginRateLimit,
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
import { requireAuth, requireAuthorization } from "../../middleware/auth";
import { incrementTokenVersion, revokeRefreshTokensForUser } from "./auth.repo";
import { ALL_ROLES } from "../../auth/roles";

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

    const { phone, address } = req.body ?? {};
    void address;
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "phone required",
      });
      return;
    }
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
async function handleOtpVerify(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const { phone, code, email } = req.body as {
      phone: string;
      code: string;
      email?: string | null;
    };

    const userAgent = req.get("user-agent");
    const verifyPayload = {
      phone,
      code,
      ...(email !== undefined ? { email } : {}),
      ...(req.ip ? { ip: req.ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      route,
      method: req.method,
    };
    const result = await verifyOtpCode(verifyPayload);

    if (!result.ok) {
      respondError(res, result.status, result.error.code, result.error.message);
      return;
    }

    const accessToken = result.token;
    if (!accessToken) {
      throw new AppError("internal_error", 500);
    }

    const responseBody = {
      ok: true,
      accessToken,
      refreshToken: result.refreshToken,
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
}

router.post("/otp/verify", otpRateLimit(), handleOtpVerify);

/**
 * POST /api/auth/login
 */
router.post("/login", loginRateLimit(), handleOtpVerify);

/**
 * POST /api/auth/logout
 */
router.post(
  "/logout",
  requireAuth,
  requireAuthorization({ roles: ALL_ROLES }),
  async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        respondError(res, 401, "invalid_token", "Invalid or expired token.");
        return;
      }

      await revokeRefreshTokensForUser(userId);
      await incrementTokenVersion(userId);

      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", refreshRateLimit(), async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken || typeof refreshToken !== "string") {
      throw new AppError("unauthorized", 401);
    }

    const result = await refreshSession({
      refreshToken,
      ...(req.ip ? { ip: req.ip } : {}),
      ...(req.get("user-agent") ? { userAgent: req.get("user-agent") } : {}),
    });

    if (!result.ok) {
      throw new AppError("unauthorized", 401);
    }

    const accessToken = result.token;

    return res.status(200).json({
      accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    if (!(err instanceof AppError)) {
      return next(new AppError("unauthorized", 401));
    }
    return next(err);
  }
});

export default router;
