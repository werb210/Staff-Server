import { Router } from "express";
import { PipelineAssignmentRequestSchema, PipelineStageUpdateSchema } from "../schemas/pipelineSchemas.js";
import { pipelineService } from "../services/pipelineService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    logInfo("GET /api/pipeline");
    const pipeline = pipelineService.listPipeline();
    res.json({ message: "OK", data: pipeline });
  } catch (error) {
    next(error);
  }
});

router.get("/stages", (_req, res, next) => {
  try {
    logInfo("GET /api/pipeline/stages");
    const stages = pipelineService.listStages();
    res.json({ message: "OK", data: stages });
  } catch (error) {
    next(error);
  }
});

router.put("/stages/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/pipeline/stages/:id", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(PipelineStageUpdateSchema, req.body);
    const stage = pipelineService.updateStage(req.params.id, payload);
    res.json({ message: "OK", data: stage });
  } catch (error) {
    next(error);
  }
});

router.post("/assignments", (req, res, next) => {
  try {
    logInfo("POST /api/pipeline/assignments", req.body);
    const payload = parseWithSchema(PipelineAssignmentRequestSchema, req.body);
    const assignment = pipelineService.assignStage(payload);
    res.status(201).json({ message: "OK", data: assignment });
  } catch (error) {
    next(error);
  }
});

router.delete("/assignments/:id", (req, res) => {
  logInfo("DELETE /api/pipeline/assignments/:id", { id: req.params.id });
  res.json({ message: "OK", notice: "Assignment removal stub" });
});

router.post("/", (_req, res) => {
  logInfo("POST /api/pipeline stub");
  res.json({ message: "OK", notice: "Pipeline creation stub" });
});

export default router;
