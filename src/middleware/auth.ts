import { Request, Response, NextFunction } from "express";
import { CAPABILITIES, getCapabilitiesForRole } from "../auth/capabilities";
import { ROLES, isRole } from "../auth/roles";
import { verifyAccessToken } from "../auth/jwt";
import { logInfo, logWarn } from "../observability/logger";

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

type AuthHeaderStatus = "present" | "missing" | "malformed";

function getAuthHeaderInfo(req: Request): { token: string | null; status: AuthHeaderStatus } {
  const header = req.headers.authorization;
  if (!header) {
    return { token: null, status: "missing" };
  }
  if (!header.startsWith("Bearer ")) {
    return { token: null, status: "malformed" };
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return { token: null, status: "malformed" };
  }
  return { token, status: "present" };
}

function getAccessTokenFromCookie(req: Request): string | null {
  const cookieToken =
    typeof (req as { cookies?: Record<string, unknown> }).cookies?.access_token === "string"
      ? ((req as { cookies?: Record<string, unknown> }).cookies?.access_token as string)
      : null;
  if (cookieToken) {
    return cookieToken;
  }
  const rawCookie = req.headers.cookie;
  if (!rawCookie) {
    return null;
  }
  const cookies = rawCookie.split(";").map((entry) => entry.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith("access_token=")) {
      const value = cookie.slice("access_token=".length);
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

function logAuthHeaderStatus(status: AuthHeaderStatus): void {
  switch (status) {
    case "present":
      logInfo("auth_header_present");
      break;
    case "missing":
      logWarn("auth_header_missing");
      break;
    case "malformed":
      logWarn("auth_header_malformed");
      break;
    default:
      break;
  }
}

function logAuthSuccess(user: AuthUser): void {
  logInfo("auth_token_verified", {
    subject: user.userId,
    role: user.role,
  });
}

function getAuthenticatedUserFromToken(token: string): AuthUser | null {
  try {
    const payload = verifyAccessToken(token) as {
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { token, status } = getAuthHeaderInfo(req);
  logAuthHeaderStatus(status);
  const resolvedToken = token ?? getAccessTokenFromCookie(req);
  if (!resolvedToken) {
    const error = status === "malformed" ? "invalid_token" : "missing_token";
    return res.status(401).json({ error });
  }
  const user = getAuthenticatedUserFromToken(resolvedToken);
  if (!user) {
    logWarn("auth_token_invalid");
    return res.status(401).json({ error: "invalid_token" });
  }
  logAuthSuccess(user);
  req.user = user;
  next();
}

export function getAuthenticatedUserFromRequest(req: Request): AuthUser | null {
  const { token, status } = getAuthHeaderInfo(req);
  logAuthHeaderStatus(status);
  const resolvedToken = token ?? getAccessTokenFromCookie(req);
  if (!resolvedToken) {
    return null;
  }
  const user = getAuthenticatedUserFromToken(resolvedToken);
  if (!user) {
    logWarn("auth_token_invalid");
    return null;
  }
  logAuthSuccess(user);
  return user;
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
