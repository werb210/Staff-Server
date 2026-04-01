import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : (err?.message ?? "Internal server error");

  res.locals.__wrapped = true;

  return res.status(500).json({
    status: "error",
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
}
