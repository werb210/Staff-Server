import { Router } from "express";
import { pipelineAssignmentSchema } from "../schemas/pipeline.schema.js";
import { pipelineService } from "../services/pipelineService.js";

const pipelineRouter = Router();

/**
 * GET /api/pipeline
 * Returns the configured pipeline stages for application processing.
 */
pipelineRouter.get("/", async (_req, res) => {
  const stages = await pipelineService.listStages();
  res.json({ stages });
});

/**
 * POST /api/pipeline/assign
 * Assigns an application to a specific pipeline stage.
 */
pipelineRouter.post("/assign", async (req, res) => {
  try {
    const payload = pipelineAssignmentSchema.parse({
      ...req.body,
      assignedAt: req.body?.assignedAt ?? new Date().toISOString()
    });
    const assignment = await pipelineService.assignToStage(payload);
    res.status(201).json({ assignment });
  } catch (error) {
    res.status(400).json({
      message: "Failed to assign pipeline stage",
      error: (error as Error).message
    });
  }
});

export default pipelineRouter;
