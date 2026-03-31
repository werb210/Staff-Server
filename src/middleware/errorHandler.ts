import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("ERROR:", err);
  return res.status(500).json({
    success: false,
    message: "internal_error"
  });
}
