import { type Request, type Response } from "express";
import { ApplicationStage } from "../modules/applications/pipelineState";

export async function listApplicationStages(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(200).json([
    ApplicationStage.RECEIVED,
    ApplicationStage.DOCUMENTS_REQUIRED,
    ApplicationStage.IN_REVIEW,
    ApplicationStage.STARTUP,
    ApplicationStage.OFF_TO_LENDER,
    ApplicationStage.ACCEPTED,
    ApplicationStage.DECLINED,
  ]);
}
