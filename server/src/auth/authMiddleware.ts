import type { Request, Response, NextFunction } from "express";

import { verifyJwt, type JwtUserPayload } from "./authService.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const decoded = verifyJwt(token);
    req.user = decoded as JwtUserPayload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
