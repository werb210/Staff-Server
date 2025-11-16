// server/src/middlewares/siloGuard.ts
import type { Request, Response, NextFunction } from "express";

export function siloGuard(_req: Request, _res: Response, next: NextFunction) {
  // Placeholder — real logic added later
  next();
}
