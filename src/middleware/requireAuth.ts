import type { NextFunction, Request, Response } from "express";
import {
  getAuthenticatedUserFromRequest,
  requireAuth,
  requireCapability,
} from "./auth";

/**
 * Re-export canonical auth helpers.
 * All routes must use these exports, not reimplement auth logic.
 */
export { requireAuth, requireCapability, getAuthenticatedUserFromRequest };

/**
 * Auth wrapper with explicit internal-route bypass ONLY.
 *
 * Rules:
 * - /api/_int/* routes bypass auth entirely (health, build, diagnostics)
 * - ALL other routes REQUIRE a valid access token
 * - NO method-based bypasses
 * - NO silent fallthrough
 */
export default function requireAuthWithInternalBypass(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Internal diagnostics endpoints are explicitly unauthenticated
  if (req.path.startsWith("/api/_int/")) {
    next();
    return;
  }

  // Always require authentication
  const user = getAuthenticatedUserFromRequest(req);

  if (!user) {
    requireAuth(req, res, next);
    return;
  }

  req.user = user;
  next();
}
