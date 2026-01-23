import { Request, Response, NextFunction } from "express";
import { logError } from "../observability/logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode || err.status || 500;
  const message = typeof err?.message === "string" ? err.message : "";
  const requestId = res.locals.requestId ?? "unknown";

  logError("request_error", {
    requestId,
    errorMessage: message,
    errorStack: err?.stack,
  });

  res.status(status).json({
    ok: false,
    error: err.code || (message ? message : "internal_error"),
  });
}
