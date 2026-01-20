import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CAPABILITIES, getCapabilitiesForRole } from "../auth/capabilities";
import { ROLES, isRole } from "../auth/roles";

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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
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
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
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
