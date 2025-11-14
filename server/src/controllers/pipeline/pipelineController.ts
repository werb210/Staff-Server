import type { Request, Response } from "express";
import {
  getPipelineForSilo,
  updatePipelineCardStage,
} from "../../services/pipelineService.js";

export async function fetchPipeline(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const pipeline = await getPipelineForSilo(user, silo as any);
  return res.json({ message: "OK", data: pipeline });
}

export async function changeCardStage(req: Request, res: Response) {
  const user = req.user;
  const { cardId } = req.params;
  const { stage } = req.body;

  const updated = await updatePipelineCardStage(user, cardId, stage);
  return res.json({ message: "OK", data: updated });
}
