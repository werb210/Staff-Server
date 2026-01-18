import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { forbiddenError } from "./errors";
import { type Role, isRole } from "../auth/roles";
import { logWarn } from "../observability/logger";
import {
  type Capability,
  getCapabilitiesForRole,
} from "../auth/capabilities";
import { type AuthenticatedUser } from "../types/auth";
import { getAccessTokenSecret, getJwtClockSkewSeconds } from "../config";

type AccessTokenPayload = JwtPayload & {
  sub?: string;
  role?: string;
  tokenVersion?: number;
};

const AUTH_ME_GRACE_WINDOW_MS = 5 * 60 * 1000;

const PUBLIC_PATHS = new Set([
  "/health",
  "/ready",
  "/api/health",
  "/api/ready",
  "/api/_int/health",
  "/api/_int/ready",
  "/api/_int/build",
  "/api/_int/routes",
  "/api/_int/env",
]);

function normalizePath(path: string): string {
  return path.split("?")[0];
}

function parseBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(normalizePath(path));
}

function resolveAuthError(res: Response): void {
  res.status(503).json({
    code: "auth_unavailable",
    message: "Authentication is not configured.",
    requestId: res.locals.requestId ?? "unknown",
  });
}

export default function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestPath = normalizePath(req.originalUrl ?? req.path);
  if (isPublicPath(requestPath)) {
    next();
    return;
  }
  const token = parseBearer(req);
  if (!token) {
    logWarn("auth_missing_token", {
      reason: "missing",
      route: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(401).json({
      code: "unauthorized",
      message: "Unauthorized.",
      requestId: res.locals.requestId ?? "unknown",
    });
    return;
  }

  const secret = getAccessTokenSecret();
  if (!secret) {
    logWarn("auth_secret_missing", {
      route: req.originalUrl,
    });
    resolveAuthError(res);
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: getJwtClockSkewSeconds(),
    });
    const user = normalizeAuthenticatedUser(decoded);
    if (!user) {
      logWarn("auth_invalid_token", {
        reason: "invalid_payload",
        route: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.status(401).json({
        code: "unauthorized",
        message: "Unauthorized.",
        requestId: res.locals.requestId ?? "unknown",
      });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    const error = err instanceof Error ? err : null;
    const message = error?.message ?? "unknown_error";
    const isExpired = error?.name === "TokenExpiredError";
    if (isExpired && requestPath.startsWith("/api/auth/me")) {
      const decoded = jwt.decode(token);
      const user = decoded ? normalizeAuthenticatedUser(decoded) : null;
      const exp =
        decoded && typeof decoded === "object" && typeof decoded.exp === "number"
          ? decoded.exp * 1000
          : null;
      const withinGrace =
        exp !== null && Date.now() - exp <= AUTH_ME_GRACE_WINDOW_MS;
      if (user && withinGrace) {
        req.user = user;
        next();
        return;
      }
    }
    const reason = isExpired
      ? "expired"
      : message.includes("jwt malformed")
      ? "malformed"
      : "invalid";
    logWarn("auth_invalid_token", {
      reason,
      route: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      error: message,
    });
    res.status(401).json({
      code: "unauthorized",
      message: "Unauthorized.",
      requestId: res.locals.requestId ?? "unknown",
    });
  }
}

export function getAuthenticatedUserFromRequest(
  req: Request
): AuthenticatedUser | null {
  const token = parseBearer(req);
  if (!token) {
    return null;
  }
  const secret = getAccessTokenSecret();
  if (!secret) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: getJwtClockSkewSeconds(),
    });
    return normalizeAuthenticatedUser(decoded);
  } catch {
    return null;
  }
}

function normalizeAuthenticatedUser(
  decoded: JwtPayload | string
): AuthenticatedUser | null {
  if (!decoded || typeof decoded !== "object") {
    return null;
  }
  const payload = decoded as AccessTokenPayload;
  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    return null;
  }
  if (typeof payload.role !== "string" || !isRole(payload.role)) {
    return null;
  }
  const role = payload.role;
  return {
    userId,
    role,
    capabilities: getCapabilitiesForRole(role),
  };
}

export function requireCapability(capabilities: readonly Capability[]) {
  const allowed = capabilities;
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!allowed || allowed.length === 0) {
        next(forbiddenError());
        return;
      }
      const userPayload =
        typeof req.user === "object" && req.user !== null ? req.user : undefined;
      const userCapabilities =
        (userPayload as { capabilities?: Capability[] } | undefined)
          ?.capabilities ??
        ((userPayload as { role?: Role | null } | undefined)?.role
          ? getCapabilitiesForRole(
              (userPayload as { role?: Role | null } | undefined)?.role as Role
            )
          : []);

      if (!allowed.some((capability) => userCapabilities.includes(capability))) {
        next(forbiddenError());
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
