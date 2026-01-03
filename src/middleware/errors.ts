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
      code: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  console.error("request_error", {
    requestId,
    message: err.message,
    stack: err.stack,
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
