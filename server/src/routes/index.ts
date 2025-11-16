// server/src/routes/index.ts
import { Router } from "express";

// Middleware
import authMiddleware from "../middlewares/auth.js";
import siloGuard from "../middlewares/siloGuard.js";

// Routers
import aiRouter from "./ai.routes.js";
import applicationsRouter from "./applications.routes.js";
import authRouter from "./auth.js";
import communicationRouter from "./communication.js";
import companiesRouter from "./companies.js";
import contactsRouter from "./contacts.js";
import dealsRouter from "./deals.js";
import documentsRouter from "./documents.js";
import lendersRouter from "./lenders.routes.js";
import notificationsRouter from "./notifications.routes.js";
import pipelineRouter from "./pipeline.routes.js";

const router = Router();

/**
 * ----------------------------------------------------
 * PUBLIC ROUTES
 * ----------------------------------------------------
 */
router.use("/auth", authRouter);

/**
 * ----------------------------------------------------
 * AUTHENTICATED ROUTES
 * ----------------------------------------------------
 */
router.use(authMiddleware);

/**
 * ----------------------------------------------------
 * GLOBAL ROUTES (NO SILO REQUIRED)
 * ----------------------------------------------------
 */
router.use("/ai", aiRouter);
router.use("/companies", companiesRouter);
router.use("/contacts", contactsRouter);
router.use("/deals", dealsRouter);

/**
 * ----------------------------------------------------
 * GLOBAL BUSINESS ROUTES
 * These operate at top level (BF-only)
 * ----------------------------------------------------
 */
router.use("/applications", applicationsRouter);
router.use("/documents", documentsRouter);
router.use("/lenders", lendersRouter);
router.use("/notifications", notificationsRouter);
router.use("/communication", communicationRouter);
router.use("/pipeline", pipelineRouter);

/**
 * ----------------------------------------------------
 * SILO ROUTES (SLF / BF)
 * Same routers but silo-guarded
 * ----------------------------------------------------
 */
const siloRoutes = Router();
siloRoutes.use(siloGuard);
siloRoutes.use("/applications", applicationsRouter);
siloRoutes.use("/documents", documentsRouter);
siloRoutes.use("/lenders", lendersRouter);
siloRoutes.use("/notifications", notificationsRouter);
siloRoutes.use("/communication", communicationRouter);
siloRoutes.use("/pipeline", pipelineRouter);

router.use("/:silo", siloRoutes);

export default router;
