import { type NextFunction, type Request, type Response } from "express";
import { isDbConnectionFailure } from "../db";
import { logError, logWarn } from "../observability/logger";
import { trackException } from "../observability/appInsights";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function forbiddenError(): AppError {
  return new AppError("forbidden", "Access denied.", 403);
}

const authFailureCodes = new Set([
  "invalid_credentials",
  "account_locked",
  "account_disabled",
  "password_expired",
  "password_reset_required",
  "user_misconfigured",
  "invalid_token",
  "missing_token",
  "user_disabled",
  "auth_unavailable",
]);

const constraintViolationCodes = new Set(["23502", "23503", "23505"]);

function isConstraintViolation(err: Error): boolean {
  const code = (err as { code?: string }).code;
  return typeof code === "string" && constraintViolationCodes.has(code);
}

function isTimeoutError(err: Error): boolean {
  const code = (err as { code?: string }).code?.toLowerCase() ?? "";
  const message = err.message.toLowerCase();
  return code === "etimedout" || message.includes("timeout");
}

function resolveFailureReason(err: Error): string {
  if (err instanceof AppError) {
    if (authFailureCodes.has(err.code)) {
      return "auth_failure";
    }
    return "request_error";
  }
  if (isConstraintViolation(err)) {
    return "constraint_violation";
  }
  if (isDbConnectionFailure(err)) {
    return isTimeoutError(err) ? "db_timeout" : "db_unavailable";
  }
  return "server_error";
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.locals.requestId ?? "unknown";
  const durationMs = res.locals.requestStart
    ? Date.now() - Number(res.locals.requestStart)
    : 0;
  const failureReason = resolveFailureReason(err);
  if (err instanceof AppError) {
    logWarn("request_error", {
      requestId,
      route: req.originalUrl,
      durationMs,
      code: err.code,
      message: err.message,
      status: err.status,
      failure_reason: failureReason,
    });
    trackException({
      exception: err,
      properties: {
        requestId,
        route: req.originalUrl,
        status: err.status,
        code: err.code,
        failure_reason: failureReason,
      },
    });
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  if (isConstraintViolation(err)) {
    logWarn("request_error", {
      requestId,
      route: req.originalUrl,
      durationMs,
      code: "constraint_violation",
      status: 409,
      failure_reason: failureReason,
    });
    trackException({
      exception: err,
      properties: {
        requestId,
        route: req.originalUrl,
        status: 409,
        code: "constraint_violation",
        failure_reason: failureReason,
      },
    });
    res.status(409).json({
      code: "constraint_violation",
      message: "Request violates a database constraint.",
      requestId,
    });
    return;
  }

  if (isDbConnectionFailure(err)) {
    logError("request_error", {
      requestId,
      route: req.originalUrl,
      durationMs,
      failure_reason: failureReason,
    });
    trackException({
      exception: err,
      properties: {
        requestId,
        route: req.originalUrl,
        status: 503,
        code: "service_unavailable",
        failure_reason: failureReason,
      },
    });
    res.status(503).json({
      code: "service_unavailable",
      message: "Service unavailable.",
      requestId,
    });
    return;
  }

  logError("request_error", {
    requestId,
    route: req.originalUrl,
    durationMs,
    failure_reason: failureReason,
    stack: err.stack,
  });

  trackException({
    exception: err,
    properties: {
      requestId,
      route: req.originalUrl,
      status: 500,
    },
  });

  res.status(500).json({
    code: "server_error",
    message: "An unexpected error occurred.",
    requestId,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  const requestId = res.locals.requestId ?? "unknown";
  res.status(404).json({
    code: "not_found",
    message: "Route not found.",
    requestId,
  });
}
