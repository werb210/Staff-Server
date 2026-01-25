import { Request, Response, NextFunction } from "express";
import {
  CAPABILITIES,
  getCapabilitiesForRole,
  type Capability,
} from "../auth/capabilities";
import { ROLES, isRole, type Role } from "../auth/roles";
import { verifyAccessTokenWithUser } from "../auth/jwt";
import { DEFAULT_AUTH_SILO } from "../auth/silo";
import { logInfo, logWarn } from "../observability/logger";
import { type AuthUser as AuthUserRecord } from "../modules/auth/auth.repo";

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

type AuthResult = {
  user: AuthUser;
  userRecord: AuthUserRecord;
};

async function getAuthenticatedUserFromToken(
  token: string
): Promise<AuthResult | null> {
  try {
    const { payload, user } = await verifyAccessTokenWithUser(token);

    if (!isRole(payload.role)) {
      return null;
    }

    const tokenSilo =
      typeof payload.silo === "string" ? payload.silo.trim() : "";
    const siloFromToken = tokenSilo.length > 0;
    const resolvedSilo = siloFromToken ? tokenSilo : DEFAULT_AUTH_SILO;

    return {
      user: {
        userId: payload.sub,
        role: payload.role,
        silo: resolvedSilo,
        siloFromToken,
        capabilities: getCapabilitiesForRole(payload.role),
        phone: typeof payload.phone === "string" ? payload.phone : null,
      },
      userRecord: user,
    };
  } catch {
    return null;
  }
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
      res.status(401).json({ ok: false, error: "missing_token" });
      return;
    }
    res
      .status(401)
      .json({
        ok: false,
        error: status === "malformed" ? "invalid_token" : "missing_token",
      });
    return;
  }

  const authResult = await getAuthenticatedUserFromToken(token);
  if (!authResult) {
    logWarn("auth_token_invalid");
    res.status(401).json({ ok: false, error: "invalid_token" });
    return;
  }

  const { user, userRecord } = authResult;
  logInfo("auth_token_verified", {
    subject: user.userId,
    role: user.role,
  });

  try {
    const isDisabled =
      userRecord.disabled === true ||
      userRecord.isActive === false ||
      userRecord.active === false;
    if (isDisabled) {
      res.status(403).json({ ok: false, error: "user_disabled" });
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
    res.status(500).json({ ok: false, error: "auth_lookup_failed" });
  }
}

export async function getAuthenticatedUserFromRequest(
  req: Request
): Promise<AuthUser | null> {
  const { token } = getAuthHeaderInfo(req);
  if (!token) return null;
  const result = await getAuthenticatedUserFromToken(token);
  return result?.user ?? null;
}

export function requireCapability(required: Capability[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ ok: false, error: "missing_token" });
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
      res.status(403).json({ ok: false, error: "insufficient_capabilities" });
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
