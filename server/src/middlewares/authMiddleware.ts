// server/src/middlewares/authMiddleware.ts
import type { Request, Response, NextFunction } from "express";

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "Invalid token format" });
  }

  (req as any).user = { token };

  return next();
}
