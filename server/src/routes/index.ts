// routes/index.ts
// -----------------------------------------------------
// Unified API router for silo + non-silo routes.
// All global middleware is mounted in index.ts.
// -----------------------------------------------------

export * from "./ai.routes.js";
export * from "./applications.routes.js";
export * from "./auth.js";
export * from "./communication.js";
export * from "./companies.js";
export * from "./contacts.js";
export * from "./deals.js";
export * from "./documents.js";
export * from "./lenders.routes.js";
export * from "./notifications.routes.js";
export * from "./pipeline.routes.js";
export * from "./pipeline.js";

export { default as aiRouter } from "./ai.routes.js";
export { default as applicationsRouter } from "./applications.routes.js";
export { default as authRouter } from "./auth.js";
export { default as communicationRouter } from "./communication.js";
export { default as companiesRouter } from "./companies.js";
export { default as contactsRouter } from "./contacts.js";
export { default as dealsRouter } from "./deals.js";
export { default as documentsRouter } from "./documents.js";
export { default as lendersRouter } from "./lenders.routes.js";
export { default as notificationsRouter } from "./notifications.routes.js";
export { default as pipelineRouter } from "./pipeline.routes.js";
export { default as pipelineLegacyRouter } from "./pipeline.js";

import { Router } from "express";
import { authMiddleware, siloGuard } from "../middlewares/index.js";

import applicationsRouterDefault from "./applications.routes.js";
import lendersRouterDefault from "./lenders.routes.js";
import pipelineRouterDefault from "./pipeline.routes.js";
import notificationsRouterDefault from "./notifications.routes.js";
import aiRouterDefault from "./ai.routes.js";

const router = Router();

// -----------------------------------------------------
// AUTH REQUIRED FOR ALL ROUTES BELOW
// -----------------------------------------------------
router.use(authMiddleware);

// -----------------------------------------------------
// SILO ROUTES: /api/:silo/*
// -----------------------------------------------------
const siloRouter = Router({ mergeParams: true });

siloRouter.use("/applications", applicationsRouterDefault);
siloRouter.use("/lenders", lendersRouterDefault);
siloRouter.use("/pipeline", pipelineRouterDefault);
siloRouter.use("/notifications", notificationsRouterDefault);

// Example:
// /api/bf/applications
// /api/slf/lenders
router.use("/:silo", siloGuard, siloRouter);

// -----------------------------------------------------
// NON-SILO AI ROUTES (GLOBAL)
// Example: /api/ai/summarize
// -----------------------------------------------------
router.use("/ai", aiRouterDefault);

export default router;
