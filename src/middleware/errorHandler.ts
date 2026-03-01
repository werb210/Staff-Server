import { Request, Response, NextFunction } from "express";
import { ApiError } from "../core/errors/ApiError";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      requestId: (req as any).requestId ?? undefined,
    });
  }

  if (err?.code === "23505") {
    return res.status(409).json({
      code: "constraint_violation",
      message: "Duplicate resource",
    });
  }

  return res.status(500).json({
    code: "internal_error",
    message: "internal_error",
    requestId: (req as any).requestId ?? undefined,
  });
}
