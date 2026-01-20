import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isRole } from "../auth/roles";
import { getCapabilitiesForRole } from "../auth/capabilities";

export interface AuthUser {
  id?: string;
  role?: string;
  capabilities?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const role = payload.role; // DO NOT normalize case
    if (!role || !isRole(role)) {
      return res.status(401).json({ error: "invalid_role" });
    }

    req.user = {
      id: payload.sub,
      role,
      capabilities: getCapabilitiesForRole(role)
    };

    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
