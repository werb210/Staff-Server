import type { Request, Response, NextFunction } from "express";
import { verifySiloOrThrow } from "../silos/siloRules.js";
import type { Silo } from "../silos/siloTypes.js";

/**
 * Adds req.silo and enforces user→silo permissions.
 */

export function siloGuard(targetSilo: Silo) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userSilos: Silo[] | undefined = (req as any).user?.silos;
      verifySiloOrThrow(userSilos, targetSilo);
      (req as any).silo = targetSilo;
      next();
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  };
}
