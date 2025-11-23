import { Request, Response, NextFunction } from "express";

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
