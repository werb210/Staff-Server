import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { pipelineService } from "../services/pipelineService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getPipeline = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const pipeline = pipelineService.list(silo);
  return res.json({ silo, pipeline });
};

export const moveCard = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const cardId = req.params.appId;
  const { stage } = req.body ?? {};

  if (typeof stage !== "string" || stage.trim().length === 0) {
    return res.status(400).json({ error: "stage is required" });
  }

  const updated = pipelineService.updateStage(silo, cardId, stage);
  if (!updated) {
    return res.status(404).json({ error: "Pipeline card not found" });
  }

  return res.json(updated);
};
