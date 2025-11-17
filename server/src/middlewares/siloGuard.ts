// server/src/middlewares/siloGuard.ts
import type { Request, Response, NextFunction } from "express";

const ALLOWED_SILOS = ["bf", "slf"];

export default function siloGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const silo = req.params.silo?.toLowerCase();

  if (!silo || ALLOWED_SILOS.indexOf(silo) === -1) {
    return res
      .status(400)
      .json({ ok: false, error: `Invalid silo '${silo}'. Allowed: bf, slf.` });
  }

  (req as any).silo = silo;

  return next();
}
