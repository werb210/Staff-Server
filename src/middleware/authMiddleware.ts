import { Request, Response, NextFunction } from 'express';
import { fail } from "../lib/response";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // placeholder auth — replace later
  if (!req.headers.authorization) {
    return res.status(401).json(fail("Unauthorized", (req as any).rid));
  }

  next();
}
