import { type Request, type Response } from "express";
import { getRequestId } from "../../middleware/requestContext";
import { logError } from "../../observability/logger";
import { validateAuthMe } from "../../validation/auth.validation";

function getAuthRequestId(res: Response): string {
  return res.locals.requestId ?? getRequestId() ?? "unknown";
}

function sanitizeStatus(status: number): number {
  return status >= 500 ? 503 : status;
}

function respondAuthError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  const requestId = getAuthRequestId(res);
  res.status(sanitizeStatus(status)).json({
    ok: false,
    data: null,
    error: { code, message },
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

export async function authMeHandler(
  req: Request,
  res: Response
): Promise<void> {
  const route = "/api/auth/me";
  const requestId = getAuthRequestId(res);

  try {
    const user = req.user;

    if (!user) {
      respondAuthError(
        res,
        401,
        "missing_token",
        "Authorization token is required."
      );
      return;
    }

    const responseBody = {
      ok: true,
      data: {
        userId: user.userId,
        role: user.role,
        phone: user.phone ?? null,
        capabilities: user.capabilities,
      },
      error: null,
      requestId,
    };

    const validation = validateAuthMe(responseBody);
    if (!validation.success) {
      respondResponseValidationError(
        res,
        route,
        requestId,
        validation.error.flatten()
      );
      return;
    }

    res.status(200).json(responseBody);
  } catch (err) {
    logError("auth_me_failed", {
      route,
      requestId,
      err,
    });

    respondAuthError(
      res,
      401,
      "invalid_token",
      "Invalid or expired authorization token."
    );
  }
}
