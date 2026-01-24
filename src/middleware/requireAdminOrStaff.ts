import { Request, Response, NextFunction } from "express";
import { ROLES } from "../auth/roles";

export function requireAdminOrStaff(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const role = req.user?.role;
  if (role !== ROLES.ADMIN && role !== ROLES.STAFF) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }

  next();
}
