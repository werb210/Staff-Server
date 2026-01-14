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

type AccessTokenPayload = JwtPayload & {
  sub?: string;
  role?: string;
  phone?: string;
  capabilities?: Capability[] | string[];
};

function parseBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

export default function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path.startsWith("/api/_int") || req.path.startsWith("/api/auth")) {
    next();
    return;
  }
  const token = parseBearer(req);
  if (!token) {
    logWarn("auth_missing_token", {
      route: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "", {
      algorithms: ["HS256"],
    });
    const user = normalizeAuthenticatedUser(decoded);
    if (!user) {
      logWarn("auth_invalid_token", {
        route: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.sendStatus(401);
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    logWarn("auth_invalid_token", {
      route: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      error: err instanceof Error ? err.message : "unknown_error",
    });
    res.sendStatus(401);
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
  if (typeof payload.role === "string" && !isRole(payload.role)) {
    throw forbiddenError("Unknown role.");
  }
  const role =
    typeof payload.role === "string" && isRole(payload.role) ? payload.role : null;
  const phone = typeof payload.phone === "string" ? payload.phone : null;
  const capabilities = Array.isArray(payload.capabilities)
    ? (payload.capabilities.filter(
        (capability): capability is Capability => typeof capability === "string"
      ) as Capability[])
    : undefined;
  return {
    userId,
    role,
    phone,
    capabilities: capabilities ?? (role ? getCapabilitiesForRole(role) : []),
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
