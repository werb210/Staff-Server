// server/src/routes/index.ts

import { Router } from "express";
import applicationsRouter from "./applications.routes.js";
import documentsRouter from "./documents.routes.js";
import lendersRouter from "./lenders.routes.js";
import notificationsRouter from "./notifications.routes.js";
import aiRouter from "./ai.routes.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import siloGuard from "../middlewares/siloGuard.js";

const router = Router();

// PUBLIC
router.use("/ai", aiRouter);

// AUTH
router.use(authMiddleware);

// CORE ROUTES
router.use("/applications", applicationsRouter);
router.use("/documents", documentsRouter);
router.use("/lenders", lendersRouter);
router.use("/notifications", notificationsRouter);

// SILO ROUTES
router.use("/:silo", siloGuard, applicationsRouter);

export default router;
