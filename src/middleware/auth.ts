import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errors";
import { type Role } from "../auth/roles";

export type AuthenticatedUser = {
  userId: string;
  role: Role;
};

type TokenPayload = {
  userId: string;
  role: Role;
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

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearer(req);
  if (!token) {
    next(new AppError("missing_token", "Authorization token is required.", 401));
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new AppError("auth_misconfigured", "Auth is not configured.", 503));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    if (!payload.userId || !payload.role) {
      next(new AppError("invalid_token", "Invalid access token.", 401));
      return;
    }
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError("invalid_token", "Invalid access token.", 401));
  }
}

export function requireRole(roles: Role | readonly Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !allowed.includes(userRole)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    next();
  };
}
