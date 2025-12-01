import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import pipelineEventsRepo from "../db/repositories/pipelineEvents.repo.js";
import applicationsRepo from "../db/repositories/applications.repo.js";

export const pipelineController = {
  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const events = await pipelineEventsRepo.findMany({ applicationId });
    res.json(events);
  }),

  moveStage: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const { stage, reason } = req.body;

    const updated = await applicationsRepo.update(applicationId, {
      pipelineStage: stage,
    });

    const event = await pipelineEventsRepo.create({
      applicationId,
      stage,
      reason,
    });

    res.json({ updated, event });
  }),
};

export default pipelineController;
