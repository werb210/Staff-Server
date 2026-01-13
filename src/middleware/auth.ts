import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { forbiddenError } from "./errors";
import { type Role } from "../auth/roles";
import { recordAuditEvent } from "../modules/audit/audit.service";
import {
  type Capability,
  getCapabilitiesForRole,
} from "../auth/capabilities";

export type AuthenticatedUser = JwtPayload | string;

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
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET ?? "", {
      algorithms: ["HS256"],
    });
    req.user = decoded as AuthenticatedUser;
    next();
  } catch {
    res.sendStatus(401);
  }
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
        (userPayload as { capabilities?: Capability[] } | undefined)?.capabilities ??
        (userPayload as { role?: Role } | undefined)?.role
          ? getCapabilitiesForRole(
              (userPayload as { role?: Role } | undefined)?.role as Role
            )
          : [];

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
