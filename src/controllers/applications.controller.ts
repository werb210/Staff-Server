import { type Request, type Response } from "express";
import { listApplicationPipelineStages } from "../modules/applications/applications.repo";

export async function listApplicationStages(
  _req: Request,
  res: Response
): Promise<void> {
  const stages = await listApplicationPipelineStages();
  res.status(200).json(Array.isArray(stages) ? stages : []);
}
