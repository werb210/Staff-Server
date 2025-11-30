// server/src/controllers/pipelineController.ts
import type { Request, Response } from "express";
import * as pipelineService from "../services/pipelineService.js";

//
// ======================================================
//  Get Pipeline History
// ======================================================
//
export async function getPipeline(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const events = await pipelineService.getPipeline(applicationId);

    return res.status(200).json(events);
  } catch (err: any) {
    console.error("getPipeline error →", err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  Update/Override Pipeline Stage (staff action)
// ======================================================
//
export async function updateStage(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;
    const { stage, reason } = req.body;

    if (!stage) return res.status(400).json({ error: "New stage required." });

    const updated = await pipelineService.updateStage(applicationId, stage, reason);

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error("updateStage error →", err);
    return res.status(500).json({ error: err.message });
  }
}
