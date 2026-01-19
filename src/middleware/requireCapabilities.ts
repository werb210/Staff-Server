import { Request, Response, NextFunction } from "express";
import { CAPABILITIES } from "../auth/capabilities";

export function requireCapabilities(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userCaps: string[] = req.user?.capabilities ?? [];

    // OPS_MANAGE is a superset – always allow
    if (userCaps.includes(CAPABILITIES.OPS_MANAGE)) {
      return next();
    }

    const hasAll = required.every((cap) => userCaps.includes(cap));

    if (!hasAll) {
      return res.status(403).json({ error: "insufficient_capabilities" });
    }

    return next();
  };
}
