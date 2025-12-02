import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import pipelineRepo from "../db/repositories/pipeline.repo.js";

export const pipelineController = {
  getPipeline: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const row = await pipelineRepo.findByApplication(applicationId);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  }),

  updateStage: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const { stage } = req.body;

    const updated = await pipelineRepo.updateStage(applicationId, stage);
    if (!updated) return res.status(404).json({ error: "Not found" });

    res.json(updated);
  }),
};

export default pipelineController;
