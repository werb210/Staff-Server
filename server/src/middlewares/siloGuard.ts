import { Request, Response, NextFunction } from "express";
import type { Role } from "../types/user.js";

export function siloGuard(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user || !user.roles) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const hasRole = (user.roles as Role[]).some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
