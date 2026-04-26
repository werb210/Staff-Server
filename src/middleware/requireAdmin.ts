import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = String((req as any).user?.role ?? "").toLowerCase();
  if (role !== "admin") {
    res.status(403).json({ error: "admin_only", message: "This action requires Admin role." });
    return;
  }
  next();
}
