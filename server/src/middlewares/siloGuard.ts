// server/src/middlewares/siloGuard.ts

import type { Request, Response, NextFunction } from "express";

export default function siloGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const silo = req.params.silo;

  if (!["bf", "slf"].includes(silo.toLowerCase())) {
    return res.status(400).json({ ok: false, error: "Invalid silo" });
  }

  next();
}
