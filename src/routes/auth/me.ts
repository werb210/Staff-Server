// src/routes/auth/me.ts

import { type Request, type Response } from "express";
import { getCapabilitiesForRole } from "../../auth/capabilities";
import { isRole } from "../../auth/roles";
import { getRequestId } from "../../middleware/requestContext";
import { logError } from "../../observability/logger";
import { validateAuthMe } from "../../validation/auth.validation";

function getAuthRequestId(res: Response): string {
  return res.locals.requestId ?? getRequestId() ?? "unknown";
}

function sanitizeAuthStatus(status: number): number {
  if (status >= 500) {
    return 503;
  }
  return status;
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
    ok: false,
    data: null,
    error: {
      code: "invalid_response_shape",
      message: "Invalid auth response shape",
    },
    requestId,
  });
}

export async function authMeHandler(req: Request, res: Response): Promise<void> {
  const route = "/api/auth/me";
  const requestId = getAuthRequestId(res);

  try {
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
      Array.isArray(req.user.capabilities)
        ? req.user.capabilities
        : role && isRole(role)
        ? getCapabilitiesForRole(role)
        : [];

    const responseBody = {
      ok: true,
      data: {
        userId: req.user.userId,
        role,
        phone: req.user.phone,
        capabilities,
      },
      error: null,
      requestId,
    };

    const responseValidation = validateAuthMe(responseBody);
    if (!responseValidation.success) {
      respondAuthResponseValidationError(
        res,
        route,
        requestId,
        responseValidation.error.flatten()
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
