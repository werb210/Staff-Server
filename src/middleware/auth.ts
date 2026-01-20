import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CAPABILITIES, getCapabilitiesForRole } from "../auth/capabilities";
import { ROLES, isRole } from "../auth/roles";
import { getAccessTokenSecret } from "../config";
import { getSessionTokenFromRequest } from "../auth/session";

export interface AuthUser {
  userId: string;
  role: string;
  capabilities?: string[];
  phone?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getAuthTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  const sessionToken = getSessionTokenFromRequest(req);
  return sessionToken ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }
  const user = getAuthenticatedUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "invalid_token" });
  }
  req.user = user;
  next();
}

export function getAuthenticatedUserFromRequest(req: Request): AuthUser | null {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return null;
  }
  const secret = getAccessTokenSecret();
  if (!secret) {
    return null;
  }
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as {
      sub?: string;
      role?: string;
      phone?: string | null;
    };
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const role = payload.role; // DO NOT normalize case
    if (!userId || !role || !isRole(role)) {
      return null;
    }
    return {
      userId,
      role,
      capabilities: getCapabilitiesForRole(role),
      phone: typeof payload.phone === "string" ? payload.phone : null,
    };
  } catch {
    return null;
  }
}

export function requireCapability(required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "missing_token" });
    }
    const userCaps: string[] = user.capabilities ?? [];

    if (userCaps.includes(CAPABILITIES.OPS_MANAGE)) {
      return next();
    }

    if (
      user.role === ROLES.STAFF &&
      required.length === 1 &&
      required[0] === CAPABILITIES.LENDERS_READ
    ) {
      return next();
    }

    const hasAll = required.every((cap) => userCaps.includes(cap));
    if (!hasAll) {
      return res.status(403).json({ error: "insufficient_capabilities" });
    }
    return next();
  };
}

const authMiddleware = {
  requireAuth,
  requireCapability,
  getAuthenticatedUserFromRequest,
};

export default authMiddleware;
