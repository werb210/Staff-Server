import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import requireAuthWithInternalBypass from "../middleware/requireAuth";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";
import { authMeHandler } from "./auth/me";

const router = Router();

/**
 * GET /api/auth/me
 * - Auth required
 * - Uses canonical auth wrapper
 */
router.get(
  "/me",
  requireAuthWithInternalBypass,
  authMeHandler
);

/**
 * OTP + authentication flows
 * These routes manage their own auth semantics internally
 */
router.use("/", authRoutes);

/**
 * Terminal handlers
 */
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
