// server/src/routes/index.ts

import { Router } from "express";

import healthRouter from "./health.routes.js";
import applicationsRouter from "./applications.routes.js";
import documentsRouter from "./documents.routes.js";
import lendersRouter from "./lenders.routes.js";
import notificationsRouter from "./notifications.routes.js";
import aiRouter from "./ai.routes.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import siloGuard from "../middlewares/siloGuard.js";

const router = Router();

/**
 * IMPORTANT:
 * PUBLIC ROUTES MUST COME FIRST
 * These should NEVER require Authorization headers.
 */
router.use("/health", healthRouter);
router.use("/ai", aiRouter);

/**
 * PROTECTED ROUTES
 * All require auth token.
 */
router.use("/applications", authMiddleware, applicationsRouter);
router.use("/documents", authMiddleware, documentsRouter);
router.use("/lenders", authMiddleware, lendersRouter);
router.use("/notifications", authMiddleware, notificationsRouter);

/**
 * SILO ROUTES — must ALWAYS be last
 * Example: /bf/applications, /slf/applications
 */
router.use("/:silo", authMiddleware, siloGuard, applicationsRouter);

export default router;
