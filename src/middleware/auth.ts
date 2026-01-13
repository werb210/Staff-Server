import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError, forbiddenError } from "./errors";
import { type Role, isRole } from "../auth/roles";
import { findAuthUserById } from "../modules/auth/auth.repo";
import { recordAuditEvent } from "../modules/audit/audit.service";
import {
  type Capability,
  getCapabilitiesForRole,
} from "../auth/capabilities";
import { getAccessTokenSecret } from "../config";

export type AuthenticatedUser = {
  id: string;
  userId: string;
  email: string | null;
  phoneNumber: string;
  role: Role;
  capabilities: Capability[];
};

type AccessTokenPayload = {
  sub: string;
  userId: string;
  role: Role;
  tokenVersion: number;
  phone?: string;
  type?: string;
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
          id: payload.userId,
          userId: payload.userId,
          email: user.email,
          phoneNumber: user.phoneNumber,
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

export function requireAccessToken(
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
    if (!payload.userId) {
      next(new AppError("invalid_token", "Invalid access token.", 401));
      return;
    }
    if (!payload.role || !isRole(payload.role)) {
      next(forbiddenError());
      return;
    }
    if (payload.type && payload.type !== "access") {
      next(new AppError("invalid_token", "Invalid access token.", 401));
      return;
    }
    if (!payload.phone || typeof payload.phone !== "string") {
      next(new AppError("invalid_token", "Invalid access token.", 401));
      return;
    }
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: null,
      phoneNumber: payload.phone,
      role: payload.role,
      capabilities: getCapabilitiesForRole(payload.role),
    };
    next();
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
