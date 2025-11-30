// server/src/routes/pipeline.routes.ts
import { Router } from "express";
import * as pipelineController from "../controllers/pipelineController.js";

const router = Router();

// Get pipeline history
router.get("/application/:applicationId", pipelineController.getPipeline);

// Manually change pipeline stage (staff only)
router.post("/application/:applicationId/update", pipelineController.updateStage);

export default router;
