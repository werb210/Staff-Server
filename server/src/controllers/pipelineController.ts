import type { Request, Response } from "express";
import type { Silo } from "../services/prisma.js";
import { pipelineService } from "../services/pipelineService.js";

const toSilo = (value: string): Silo => value as Silo;

export const getPipeline = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);
  const pipeline = await pipelineService.getBoard(user, silo);
  return res.json(pipeline);
};

export const moveCard = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);
  const appId = req.params.appId;

  const result = await pipelineService.move(user, silo, appId, req.body ?? {});
  if (!result) return res.status(404).json({ error: "Application not found" });

  return res.json(result);
};
