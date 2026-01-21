import type { NextFunction, Request, Response } from "express";
import {
  getAuthenticatedUserFromRequest,
  requireAuth,
  requireCapability,
} from "./auth";

export { requireAuth, requireCapability, getAuthenticatedUserFromRequest };

export default function requireAuthWithInternalBypass(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path.startsWith("/api/_int")) {
    next();
    return;
  }
  if (req.method === "GET") {
    const user = getAuthenticatedUserFromRequest(req);
    if (user) {
      req.user = user;
      next();
      return;
    }
  }
  requireAuth(req, res, next);
}
