import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../platform/logger";

type ErrorWithStatus = Error & { status?: number };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const typedError = err as ErrorWithStatus;
  const message = typedError?.message || "Internal Server Error";
  const status = typedError?.status ?? 500;

  logger.error("request_failed", {
    status,
    error: message,
    stack: typedError?.stack,
  });

  res.status(status).json({
    error: message,
  });
}
