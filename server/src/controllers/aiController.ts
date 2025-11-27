import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";

export const aiController = {
  generateSummary: asyncHandler(async (req: Request, res: Response) => {
    const { transcript } = req.body;
    const summary = `Summary: ${transcript ?? ""}`;
    res.json({ ok: true, summary });
  }),
};
