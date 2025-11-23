import { Request, Response, NextFunction } from "express";

/**
 * SiloGuard
 * Ensures that users cannot access resources belonging to other roles.
 * This version does NOT use module augmentation (which caused TS errors)
 * and works cleanly with standard Express types.
 */
export function siloGuard(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user || !user.role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
