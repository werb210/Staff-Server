import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { requireAuth } from "../middleware/requireAuth";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";
import { authMeHandler } from "./auth/me";

const router = Router();

/**
 * Canonical /api/auth/me
 * Must return contract-compliant shape via authMeHandler
 */
router.get("/me", requireAuth, authMeHandler);

/**
 * OTP + auth flows
 */
router.use("/", authRoutes);

/**
 * Terminal handlers
 */
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
