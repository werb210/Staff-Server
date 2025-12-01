// server/src/middlewares/auth.ts
import type { NextFunction, Request, Response } from "express";
import { authGuard } from "./authMiddleware.js";

export function auth(req: Request, res: Response, next: NextFunction) {
  return authGuard(req as any, res, next);
}

export default auth;
