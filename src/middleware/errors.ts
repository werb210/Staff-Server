import { type NextFunction, type Request, type Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.locals.requestId ?? "unknown";
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  res.status(500).json({
    error: "server_error",
    message: "An unexpected error occurred.",
    requestId,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  const requestId = res.locals.requestId ?? "unknown";
  res.status(404).json({
    error: "not_found",
    message: "Route not found.",
    requestId,
  });
}
