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
 * - /api/_int/* routes bypass auth entirely
 * - ALL other routes REQUIRE a valid access token
 * - NO method-based bypasses
 * - NO silent fallthrough
 */
export default function requireAuthWithInternalBypass(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  /**
   * IMPORTANT:
   * internal routes are mounted at `/api/_int`,
   * but at this point req.path === `/_int/...`
   */
  if (req.path.startsWith("/_int")) {
    next();
    return;
  }

  const user = getAuthenticatedUserFromRequest(req);

  if (!user) {
    requireAuth(req, res, next);
    return;
  }

  req.user = user;
  next();
}
