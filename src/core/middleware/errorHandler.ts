import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { ApiError } from "../errors/ApiError";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? randomUUID();

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      requestId,
    });
  }

  console.error("UNHANDLED ERROR:", err);

  return res.status(500).json({
    code: "internal_error",
    message: "internal_error",
    requestId,
  });
}
