import { type NextFunction, type Request, type Response } from "express";
import { AppError as CanonicalAppError } from "../errors/AppError";

export class AppError extends CanonicalAppError {
  constructor(code: string, status: number, message?: string);
  constructor(code: string, message: string, status?: number);
  constructor(code: string, arg2: number | string, arg3?: number | string) {
    const status =
      typeof arg2 === "number"
        ? arg2
        : typeof arg3 === "number"
          ? arg3
          : 500;
    const resolvedMessage =
      typeof arg2 === "string"
        ? arg2
        : typeof arg3 === "string"
          ? arg3
          : undefined;
    super(code, status, resolvedMessage);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function forbiddenError(message = "Access denied."): AppError {
  return new AppError("forbidden", message, 403);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: "not_found",
    message: "Not found",
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof CanonicalAppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
    });
    return;
  }
  res.status(500).json({
    error: "internal_error",
  });
}
