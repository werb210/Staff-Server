// server/src/middlewares/errorHandler.ts
import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("🔥 Internal Error:", err);

  res.status(err.status || 500).json({
    ok: false,
    error: err.message || "Server error",
  });
}
