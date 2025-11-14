import { Router } from "express";

import applicationRoutes from "./applications.routes.js";
import documentRoutes from "./documents.routes.js";
import lenderRoutes from "./lenders.routes.js";
import pipelineRoutes from "./pipeline.routes.js";
import communicationRoutes from "./communication.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import aiRoutes from "./ai.routes.js";

import { authMiddleware } from "../middlewares/auth.js";
import { siloGuard } from "../middlewares/siloGuard.js";

const router = Router();

router.use(authMiddleware);

router.use("/applications", siloGuard, applicationRoutes);
router.use("/documents", siloGuard, documentRoutes);
router.use("/lenders", siloGuard, lenderRoutes);
router.use("/pipeline", siloGuard, pipelineRoutes);
router.use("/communication", siloGuard, communicationRoutes);
router.use("/notifications", siloGuard, notificationsRoutes);
router.use("/ai", siloGuard, aiRoutes);

export default router;
