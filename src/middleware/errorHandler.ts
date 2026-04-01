import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("SERVER ERROR:", err);

  if (err?.name === "UnauthorizedError") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}
