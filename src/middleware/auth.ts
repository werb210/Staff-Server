import { Request, Response, NextFunction } from "express";
import {
  CAPABILITIES,
  getCapabilitiesForRole,
  type Capability,
} from "../auth/capabilities";
import { ROLES, isRole, type Role } from "../auth/roles";
import { verifyAccessToken } from "../auth/jwt";
import { DEFAULT_AUTH_SILO } from "../auth/silo";
import { logInfo, logWarn } from "../observability/logger";
import { findAuthUserById } from "../modules/auth/auth.repo";

export interface AuthUser {
  userId: string;
  role: Role;
  silo: string;
  siloFromToken: boolean;
  capabilities: Capability[];
  lenderId?: string | null;
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

function getAuthHeaderInfo(
  req: Request
): { token: string | null; status: AuthHeaderStatus } {
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

function logAuthHeaderStatus(status: AuthHeaderStatus): void {
  if (status === "missing") logWarn("auth_header_missing");
  if (status === "malformed") logWarn("auth_header_malformed");
}

function getAuthenticatedUserFromToken(token: string): AuthUser | null {
  let payload: unknown;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const { sub, role, phone, silo: siloClaim } = payload as {
    sub?: unknown;
    role?: unknown;
    phone?: unknown;
    silo?: unknown;
  };

  if (typeof sub !== "string" || !isRole(role)) {
    return null;
  }

  const tokenSilo =
    typeof siloClaim === "string" ? siloClaim.trim() : "";
  const siloFromToken = tokenSilo.length > 0;
  const resolvedSilo = siloFromToken ? tokenSilo : DEFAULT_AUTH_SILO;

  return {
    userId: sub,
    role,
    silo: resolvedSilo,
    siloFromToken,
    capabilities: getCapabilitiesForRole(role),
    phone: typeof phone === "string" ? phone : null,
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { token, status } = getAuthHeaderInfo(req);
  logAuthHeaderStatus(status);

  if (!token) {
    const rawHeader = req.headers.authorization?.trim().toLowerCase();
    if (status === "malformed" && rawHeader === "bearer") {
      res.status(401).json({ error: "missing_token" });
      return;
    }
    res
      .status(401)
      .json({ error: status === "malformed" ? "invalid_token" : "missing_token" });
    return;
  }

  const user = getAuthenticatedUserFromToken(token);
  if (!user) {
    logWarn("auth_token_invalid");
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  logInfo("auth_token_verified", {
    subject: user.userId,
    role: user.role,
  });

  try {
    const userRecord = await findAuthUserById(user.userId);
    if (!userRecord) {
      res.status(401).json({ error: "invalid_user" });
      return;
    }
    const isDisabled =
      userRecord.disabled === true ||
      userRecord.isActive === false ||
      userRecord.active === false;
    if (isDisabled) {
      res.status(403).json({ error: "user_disabled" });
      return;
    }
    req.user = {
      ...user,
      lenderId: userRecord.lenderId ?? null,
    };
    next();
  } catch (err) {
    logWarn("auth_user_lookup_failed", {
      error: err instanceof Error ? err.message : "unknown_error",
    });
    res.status(500).json({ error: "auth_lookup_failed" });
  }
}

export function getAuthenticatedUserFromRequest(
  req: Request
): AuthUser | null {
  const { token } = getAuthHeaderInfo(req);
  if (!token) return null;
  return getAuthenticatedUserFromToken(token);
}

export function requireCapability(required: Capability[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "missing_token" });
      return;
    }

    // OPS_MANAGE is absolute override
    if (user.capabilities.includes(CAPABILITIES.OPS_MANAGE)) {
      next();
      return;
    }

    // Explicit STAFF read-only exception
    if (
      user.role === ROLES.STAFF &&
      required.length === 1 &&
      required[0] === CAPABILITIES.LENDERS_READ
    ) {
      next();
      return;
    }

    const hasAll = required.every((cap) =>
      user.capabilities.includes(cap)
    );

    if (!hasAll) {
      res.status(403).json({ error: "insufficient_capabilities" });
      return;
    }

    next();
  };
}

export default {
  requireAuth,
  requireCapability,
  getAuthenticatedUserFromRequest,
};
