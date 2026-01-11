import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError, forbiddenError } from "./errors";
import { type Role } from "../auth/roles";
import { findAuthUserById } from "../modules/auth/auth.repo";
import { recordAuditEvent } from "../modules/audit/audit.service";
import {
  type Capability,
  getCapabilitiesForRole,
} from "../auth/capabilities";
import { getAccessTokenSecret } from "../config";

export type AuthenticatedUser = {
  userId: string;
  email: string | null;
  role: Role;
  capabilities: Capability[];
};

type AccessTokenPayload = {
  userId: string;
  role: Role;
  tokenVersion: number;
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

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = parseBearer(req);
  if (!token) {
    next(new AppError("missing_token", "Authorization token is required.", 401));
    return;
  }

  const secret = getAccessTokenSecret();
  if (!secret) {
    next(new AppError("auth_misconfigured", "Auth is not configured.", 503));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;
    if (
      !payload.userId ||
      !payload.role ||
      typeof payload.tokenVersion !== "number"
    ) {
      next(new AppError("invalid_token", "Invalid access token.", 401));
      return;
    }
    findAuthUserById(payload.userId)
      .then((user) => {
        if (!user || !user.active) {
          next(new AppError("user_disabled", "User is disabled.", 403));
          return;
        }
        if (
          user.tokenVersion !== payload.tokenVersion ||
          user.role !== payload.role
        ) {
          next(new AppError("invalid_token", "Invalid access token.", 401));
          return;
        }
        req.user = {
          userId: payload.userId,
          email: user.email,
          role: payload.role,
          capabilities: getCapabilitiesForRole(payload.role),
        };
        next();
      })
      .catch((err) => next(err));
  } catch {
    next(new AppError("invalid_token", "Invalid access token.", 401));
  }
}

export function requireCapability(capabilities: readonly Capability[]) {
  const allowed = capabilities;
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!allowed || allowed.length === 0) {
        await recordAuditEvent({
          action: "access_denied",
          actorUserId: req.user?.userId ?? null,
          targetUserId: null,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          success: false,
        });
        next(forbiddenError());
        return;
      }
      const userCapabilities = req.user?.capabilities ?? [];

      if (!allowed.some((capability) => userCapabilities.includes(capability))) {
        await recordAuditEvent({
          action: "access_denied",
          actorUserId: req.user?.userId ?? null,
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
