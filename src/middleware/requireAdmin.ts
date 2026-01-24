import { Request, Response, NextFunction } from "express";
import { ROLES } from "../auth/roles";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }

  next();
}
