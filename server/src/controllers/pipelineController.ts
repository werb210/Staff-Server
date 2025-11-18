// FILE: server/src/controllers/pipelineController.ts
import { Request, Response } from "express";
import pipelineService from "../services/pipelineService.js";

export const getPipeline = async (_req: Request, res: Response) => {
  res.json(await pipelineService.getPipeline());
};

export const moveCard = async (req: Request, res: Response) => {
  res.json(await pipelineService.moveCard(req.params.id, req.body.stageId));
};

export default { getPipeline, moveCard };
