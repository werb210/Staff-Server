import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

function extractAccessToken(req: Request): string | null {
  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
}

export function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = extractAccessToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  return authenticateRequest(req, res, next);
}
