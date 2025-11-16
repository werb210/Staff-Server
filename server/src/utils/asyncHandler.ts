// server/src/utils/asyncHandler.ts
import type { Request, Response, NextFunction } from "express";

export const asyncHandler =
  (fn: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
