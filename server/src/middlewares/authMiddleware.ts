import type { NextFunction, Request, RequestHandler, Response } from "express";
import usersRepo from "../db/repositories/users.repo.js";
import tokenService from "../services/tokenService.js";
import type { AuthUser, Role } from "../types/user.js";
import { toAuthUser } from "../utils/userUtils.js";

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export const authGuard: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = tokenService.verify(token);
    const userRecord = await usersRepo.findById(payload.userId);
    const authUser = toAuthUser(userRecord);

    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    (req as AuthenticatedRequest).user = authUser;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authMiddleware = authGuard;

export function roleGuard(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authRequest = req as AuthenticatedRequest;
    const userRoles = authRequest.user?.roles ?? [];
    if (!authRequest.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasRole = userRoles.some((role) => allowedRoles.includes(role as Role));
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
