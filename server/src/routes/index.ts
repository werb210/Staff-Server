// server/src/routes/index.ts

import { Router } from "express";
import healthRouter from "./health.routes.js";
import aiRouter from "./ai.routes.js";
import applicationsRouter from "./applications.routes.js";
import documentsRouter from "./documents.routes.js";
import lendersRouter from "./lenders.routes.js";
import notificationsRouter from "./notifications.routes.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import siloGuard from "../middlewares/siloGuard.js";

const router = Router();

// -----------------------------------------------------
// PUBLIC ROUTES — 100% open, NO middleware
// -----------------------------------------------------
router.use("/health", healthRouter);
router.use("/ai", aiRouter);

// -----------------------------------------------------
// PROTECTED ROUTES — require Authorization
// -----------------------------------------------------
router.use("/applications", authMiddleware, applicationsRouter);
router.use("/documents", authMiddleware, documentsRouter);
router.use("/lenders", authMiddleware, lendersRouter);
router.use("/notifications", authMiddleware, notificationsRouter);

// -----------------------------------------------------
// SILO ROUTES — require Authorization + Siloguard
// -----------------------------------------------------
router.use("/:silo", authMiddleware, siloGuard, applicationsRouter);

export default router;
