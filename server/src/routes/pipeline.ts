import { Router } from "express";
import { z } from "zod";
import {
  PipelineAssignmentSchema,
  PipelineTransitionSchema,
} from "../schemas/pipeline.schema.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const board = req.silo!.services.pipeline.getBoard();
  res.json({ message: "OK", data: board });
});

router.post("/transition", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = PipelineTransitionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid transition" });
  }
  const result = req.silo!.services.pipeline.transitionApplication(parsed.data);
  res.json({ message: "OK", data: result });
});

router.post("/assign", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = PipelineAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid assignment" });
  }
  const result = req.silo!.services.pipeline.assignApplication(parsed.data);
  res.json({ message: "OK", data: result });
});

router.get("/assignments", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const assignments = req.silo!.services.pipeline.listAssignments();
  res.json({ message: "OK", data: assignments });
});

export default router;
