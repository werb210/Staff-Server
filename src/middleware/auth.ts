import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { forbiddenError } from "./errors";
import { type Role, isRole } from "../auth/roles";
import { recordAuditEvent } from "../modules/audit/audit.service";
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
  const token = parseBearer(req);
  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "", {
      algorithms: ["HS256"],
    });
    const user = normalizeAuthenticatedUser(decoded);
    if (!user) {
      res.sendStatus(401);
      return;
    }
    req.user = user;
    next();
  } catch {
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
  const role = typeof payload.role === "string" ? payload.role : null;
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
    capabilities:
      capabilities ?? (role && isRole(role) ? getCapabilitiesForRole(role) : []),
  };
}

export function requireCapability(capabilities: readonly Capability[]) {
  const allowed = capabilities;
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!allowed || allowed.length === 0) {
        await recordAuditEvent({
          action: "access_denied",
          actorUserId: (req.user as { userId?: string } | undefined)?.userId ?? null,
          targetUserId: null,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          success: false,
        });
        next(forbiddenError());
        return;
      }
      const userPayload =
        typeof req.user === "object" && req.user !== null ? req.user : undefined;
      const userCapabilities =
        (userPayload as { capabilities?: Capability[] } | undefined)
          ?.capabilities ??
        ((userPayload as { role?: Role | string | null } | undefined)?.role &&
        isRole((userPayload as { role?: Role | string | null } | undefined)?.role)
          ? getCapabilitiesForRole(
              (userPayload as { role?: Role | string | null } | undefined)
                ?.role as Role
            )
          : []);

      if (!allowed.some((capability) => userCapabilities.includes(capability))) {
        await recordAuditEvent({
          action: "access_denied",
          actorUserId:
            (req.user as { userId?: string } | undefined)?.userId ?? null,
          targetUserId: null,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          success: false,
        });
        next(forbiddenError());
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
