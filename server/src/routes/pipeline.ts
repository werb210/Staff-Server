import { Router } from "express";
import {
  PipelineAssignmentSchema,
  PipelineBoardSchema,
  PipelineStageSchema,
  PipelineTransitionSchema,
} from "../schemas/pipeline.schema.js";
import { pipelineService } from "../services/pipelineService.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/pipeline
 * Example: curl http://localhost:5000/api/pipeline
 */
router.get("/", (_req, res) => {
  try {
    logInfo("Generating pipeline overview");
    const board = pipelineService.getBoard();
    const payload = PipelineBoardSchema.parse(board);
    res.json({ message: "OK", data: payload });
  } catch (error) {
    logError("Failed to build pipeline", error);
    res.status(400).json({ message: "Unable to build pipeline" });
  }
});

/**
 * GET /api/pipeline/assignments
 * Example: curl http://localhost:5000/api/pipeline/assignments
 */
router.get("/assignments", (_req, res) => {
  try {
    logInfo("Listing pipeline assignments");
    const assignments = pipelineService.listAssignments();
    res.json({ message: "OK", data: assignments });
  } catch (error) {
    logError("Failed to list assignments", error);
    res.status(400).json({ message: "Unable to list assignments" });
  }
});

/**
 * POST /api/pipeline/transition
 * Example: curl -X POST http://localhost:5000/api/pipeline/transition \
 *   -H 'Content-Type: application/json' \
 *   -d '{"applicationId":"<id>","toStage":"review","assignedTo":"case.manager"}'
 */
router.post("/transition", (req, res) => {
  try {
    const payload = PipelineTransitionSchema.parse(req.body);
    logInfo("Transitioning pipeline stage", payload);
    const result = pipelineService.transitionApplication(payload);
    res.json({ message: "OK", data: result });
  } catch (error) {
    logError("Failed to transition application", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * POST /api/pipeline/assign
 * Example: curl -X POST http://localhost:5000/api/pipeline/assign \
 *   -H 'Content-Type: application/json' \
 *   -d '{"id":"<id>","assignedTo":"analyst@example.com","stage":"review"}'
 */
router.post("/assign", (req, res) => {
  try {
    const payload = PipelineAssignmentSchema.parse(req.body);
    logInfo("Assigning application", payload);
    const result = pipelineService.assignApplication(payload);
    res.json({ message: "OK", data: result });
  } catch (error) {
    logError("Failed to assign application", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * POST /api/pipeline/stage
 * Example: curl -X POST http://localhost:5000/api/pipeline/stage \
 *   -H 'Content-Type: application/json' -d '{"id":"uuid","name":"QA","status":"review","position":5,"count":0,"totalLoanAmount":0,"lastUpdatedAt":"2024-01-01T00:00:00.000Z","applications":[]}'
 */
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
