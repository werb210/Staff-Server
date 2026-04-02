import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env";
import { error } from "../lib/response";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { JWT_SECRET } = getEnv();
  const rid = (req as Request & { id?: string; rid?: string }).id ?? (req as Request & { rid?: string }).rid;

  if (!JWT_SECRET) {
    return res.status(500).json(error("Auth not configured", rid));
  }

  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json(error("Unauthorized", rid));
  }

  return next();
}

export default requireAuth;
