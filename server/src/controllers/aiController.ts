// server/src/controllers/aiController.ts

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

export const aiController = {
  generateSummary: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, text } = req.body;

    const summary = `AI summary for application ${applicationId}: ${text?.slice(0, 60)}`;

    res.json({ ok: true, summary });
  }),
};
