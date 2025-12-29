import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
  }

  const cookieToken = req.cookies?.access_token as string | undefined;
  return cookieToken ?? null;
}

export function authenticateRequest(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = extractAccessToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email };
  } catch (error) {
    req.user = undefined;
  }

  return next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
