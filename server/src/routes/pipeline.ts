import { Router } from "express";
import { applicationService } from "../services/applicationService.js";
import { PipelineStageSchema } from "../schemas/pipeline.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

// Lists a synthetic pipeline built from the in-memory applications.
router.get("/", (_req, res) => {
  try {
    logInfo("Generating pipeline overview");
    const stages = applicationService.buildPipeline();
    res.json({ message: "OK", data: stages });
  } catch (error) {
    logError("Failed to build pipeline", error);
    res.status(400).json({ message: "Unable to build pipeline" });
  }
});

// Accepts a new pipeline stage definition for testing integrations.
router.post("/stage", (req, res) => {
  try {
    const stage = PipelineStageSchema.parse(req.body);
    logInfo("Received pipeline stage", stage);
    res.status(201).json({ message: "OK", data: stage });
  } catch (error) {
    logError("Failed to record pipeline stage", error);
    res.status(400).json({ message: "Invalid pipeline stage" });
  }
});

export default router;
