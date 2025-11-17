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

  // Expect: Authorization: Bearer <token>
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "Invalid token format" });
  }

  // TODO: validate token — optional for now, pass through
  req.user = { token };

  return next();
}
