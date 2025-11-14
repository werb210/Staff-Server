import { Router } from "express";

import applicationRoutes from "./applications.routes.js";
import documentRoutes from "./documents.routes.js";
import lenderRoutes from "./lenders.routes.js";
import pipelineRoutes from "./pipeline.routes.js";
import communicationRoutes from "./communication.routes.js";
import aiRoutes from "./ai.routes.js";

import { authMiddleware } from "../middlewares/auth.js";
import { siloGuard } from "../middlewares/siloGuard.js";

const router = Router();

// --- Auth required for everything ---
router.use(authMiddleware);

// --- Application Routes ---
router.use("/applications", siloGuard, applicationRoutes);

// --- Document Routes ---
router.use("/documents", siloGuard, documentRoutes);

// --- Lender Routes ---
router.use("/lenders", siloGuard, lenderRoutes);

// --- Pipeline Routes ---
router.use("/pipeline", siloGuard, pipelineRoutes);

// --- Communication Routes (SMS, Email) ---
router.use("/communication", siloGuard, communicationRoutes);

// --- AI ---
router.use("/ai", siloGuard, aiRoutes);

export default router;
