import { type NextFunction, type Request, type Response } from "express";
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
  if (err instanceof AppError) {
    logWarn("request_error", {
      requestId,
      route: req.originalUrl,
      durationMs,
      code: err.code,
      message: err.message,
      status: err.status,
    });
    trackException({
      exception: err,
      properties: {
        requestId,
        route: req.originalUrl,
        status: err.status,
        code: err.code,
      },
    });
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  logError("request_error", {
    requestId,
    route: req.originalUrl,
    durationMs,
    message: err.message,
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
