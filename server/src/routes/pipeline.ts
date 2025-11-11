import { Router } from "express";

import { pipelineService } from "../services/pipelineService.js";

const router = Router();

router.get("/", (_req, res) => {
  const snapshot = pipelineService.getSnapshot();
  res.json({ message: "OK", pipeline: snapshot });
});

router.post("/assign", (req, res, next) => {
  try {
    const assignment = pipelineService.assignApplication(req.body);
    res.status(201).json({ message: "OK", assignment });
  } catch (error) {
    next(error);
  }
});

export default router;
