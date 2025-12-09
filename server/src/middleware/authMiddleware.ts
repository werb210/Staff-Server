import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { UserRole } from "../auth/auth.types";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Authorization header missing" });
  }
  const token = header.replace(/^Bearer\s+/i, "");
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { id: string; email: string; role?: UserRole };
    req.user = { id: payload.id, email: payload.email, role: payload.role ?? "Staff" };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
