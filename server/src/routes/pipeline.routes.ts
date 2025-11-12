import { Router } from "express";
import {
  PipelineBoardSchema,
  PipelineTransitionSchema,
  PipelineAssignmentSchema,
} from "../schemas/pipeline.schema.js";
import { applicationService } from "../services/applicationService.js";

const router = Router();

/**
 * Build and return the full pipeline board.
 * This matches the Staff Pipeline UI.
 */
router.get("/board", (req, res) => {
  try {
    const stages = applicationService.buildPipeline();
    const board = {
      stages,
      assignments: [],
    };
    const parsed = PipelineBoardSchema.parse(board);
    res.json(parsed);
  } catch (err) {
    console.error("Pipeline board error:", err);
    res.status(500).json({ error: "Failed to load pipeline board" });
  }
});

/**
 * Transition an application between stages.
 */
router.post("/transition", (req, res) => {
  try {
    const input = PipelineTransitionSchema.parse(req.body);

    const updated = applicationService.updateStatus(
      input.applicationId,
      input.toStage,
    );

    res.json({
      ok: true,
      application: updated,
    });
  } catch (err) {
    console.error("Pipeline transition error:", err);
    res.status(400).json({ error: "Invalid pipeline transition" });
  }
});

/**
 * Assign an application to a staff member.
 */
router.post("/assign", (req, res) => {
  try {
    const input = PipelineAssignmentSchema.parse(req.body);

    const updated = applicationService.assignApplication(
      input.id,
      input.assignedTo,
      input.stage,
    );

    res.json({
      ok: true,
      application: updated,
    });
  } catch (err) {
    console.error("Pipeline assignment error:", err);
    res.status(400).json({ error: "Invalid application assignment" });
  }
});

export default router;
