// server/src/middlewares/auth.ts
import type { Request, Response, NextFunction } from "express";

export function auth(req: Request, res: Response, next: NextFunction) {
  // TODO: Replace with JWT verification later
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  next();
}
