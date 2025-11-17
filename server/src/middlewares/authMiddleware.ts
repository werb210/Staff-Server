// server/src/middlewares/authMiddleware.ts

import type { Request, Response, NextFunction } from "express";

// Simple placeholder auth handler.
// We only check the header exists. Real auth logic comes later.
export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  next();
}
