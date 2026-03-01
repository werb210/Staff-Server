import { NextFunction, Request, Response } from "express";
import { AppError } from "./errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
    });
  }

  return res.status(500).json({
    error: "internal_error",
  });
}
