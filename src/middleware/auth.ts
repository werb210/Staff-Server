import { Request, Response, NextFunction } from "express";
import {
  CAPABILITIES,
  getCapabilitiesForRole,
  getRolesForCapabilities,
  type Capability,
} from "../auth/capabilities";
import { ALL_ROLES, ROLES, isRole, type Role } from "../auth/roles";
import { verifyAccessTokenWithUser } from "../auth/jwt";
import { DEFAULT_AUTH_SILO } from "../auth/silo";
import { logInfo, logWarn } from "../observability/logger";
import { type AuthUser as AuthUserRecord } from "../modules/auth/auth.repo";
import { assertLenderBinding } from "../auth/lenderBinding";

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
    let lenderId: string | null = null;
    try {
      lenderId = assertLenderBinding({
        role: user.role,
        lenderId: userRecord.lenderId ?? null,
      });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({
          ok: false,
          error: "invalid_lender_binding",
          message: err.message,
        });
        return;
      }
      res.status(400).json({ ok: false, error: "invalid_lender_binding" });
      return;
    }
    const silo = userRecord.silo ?? (user.siloFromToken ? user.silo : "");
    req.user = {
      ...user,
      silo,
      lenderId,
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

type AuthorizationOptions = {
  roles?: Role[];
  capabilities?: Capability[];
};

function logAuthorizationEvent(params: {
  name: string;
  userId: string;
  role: Role;
  endpoint: string;
  method: string;
  requestId: string;
  timestamp: string;
  requiredRoles?: Role[];
  requiredCapabilities?: Capability[];
  reason?: string;
}): void {
  logWarn(params.name, {
    userId: params.userId,
    role: params.role,
    endpoint: params.endpoint,
    method: params.method,
    requestId: params.requestId,
    timestamp: params.timestamp,
    requiredRoles: params.requiredRoles,
    requiredCapabilities: params.requiredCapabilities,
    reason: params.reason,
  });
}

function resolveRoles(
  roles: Role[] | undefined,
  capabilities: Capability[] | undefined
): Role[] {
  if (roles && roles.length > 0) {
    return [...new Set(roles)];
  }
  if (capabilities && capabilities.length > 0) {
    const derived = getRolesForCapabilities(capabilities);
    if (
      capabilities.length === 1 &&
      capabilities[0] === CAPABILITIES.LENDERS_READ &&
      !derived.includes(ROLES.STAFF)
    ) {
      derived.push(ROLES.STAFF);
    }
    return derived;
  }
  return [...ALL_ROLES];
}

export function requireAuthorization(options: AuthorizationOptions) {
  const requiredRoles = resolveRoles(options.roles, options.capabilities);
  const requiredCapabilities = options.capabilities ?? [];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    const requestId = res.locals.requestId ?? "unknown";
    const timestamp = new Date().toISOString();
    const endpoint = req.originalUrl;
    const method = req.method;

    if (!user) {
      res.status(401).json({ ok: false, error: "missing_token" });
      return;
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      logAuthorizationEvent({
        name: "authz_denied",
        userId: user.userId,
        role: user.role,
        endpoint,
        method,
        requestId,
        timestamp,
        requiredRoles,
        requiredCapabilities,
        reason: "role_mismatch",
      });
      logAuthorizationEvent({
        name: "authz_role_mismatch",
        userId: user.userId,
        role: user.role,
        endpoint,
        method,
        requestId,
        timestamp,
        requiredRoles,
        requiredCapabilities,
        reason: "role_mismatch",
      });
      const hasRequiredCaps =
        requiredCapabilities.length === 0 ||
        requiredCapabilities.every((cap) => user.capabilities.includes(cap));
      if (hasRequiredCaps || user.capabilities.includes(CAPABILITIES.OPS_MANAGE)) {
        logAuthorizationEvent({
          name: "authz_privilege_escalation",
          userId: user.userId,
          role: user.role,
          endpoint,
          method,
          requestId,
          timestamp,
          requiredRoles,
          requiredCapabilities,
          reason: "role_mismatch",
        });
      }
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    if (requiredCapabilities.length === 0) {
      next();
      return;
    }

    // OPS_MANAGE is absolute override for capabilities
    if (user.capabilities.includes(CAPABILITIES.OPS_MANAGE)) {
      next();
      return;
    }

    // Explicit STAFF read-only exception
    if (
      user.role === ROLES.STAFF &&
      requiredCapabilities.length === 1 &&
      requiredCapabilities[0] === CAPABILITIES.LENDERS_READ
    ) {
      next();
      return;
    }

    const hasAll = requiredCapabilities.every((cap) =>
      user.capabilities.includes(cap)
    );

    if (!hasAll) {
      logAuthorizationEvent({
        name: "authz_denied",
        userId: user.userId,
        role: user.role,
        endpoint,
        method,
        requestId,
        timestamp,
        requiredRoles,
        requiredCapabilities,
        reason: "insufficient_capabilities",
      });
      logAuthorizationEvent({
        name: "authz_capability_mismatch",
        userId: user.userId,
        role: user.role,
        endpoint,
        method,
        requestId,
        timestamp,
        requiredRoles,
        requiredCapabilities,
        reason: "insufficient_capabilities",
      });
      res.status(403).json({ ok: false, error: "insufficient_capabilities" });
      return;
    }

    next();
  };
}

export function requireCapability(required: Capability[]) {
  return requireAuthorization({ capabilities: required });
}

export default {
  requireAuth,
  requireCapability,
  requireAuthorization,
  getAuthenticatedUserFromRequest,
};
