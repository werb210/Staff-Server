import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { pipelineService } from "../services/pipelineService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getPipeline = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const pipeline = await pipelineService.getBoard(silo);
  return res.json(pipeline);
};

export const moveCard = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const appId = req.params.appId;

  try {
    const result = await pipelineService.move(silo, appId, req.body ?? {});
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
};
