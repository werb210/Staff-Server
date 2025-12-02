import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";

export const aiController = {
  test: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true });
  }),

  generateSummary: asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body ?? {};
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }
    // Placeholder AI summary until integrated
    res.json({ summary: `Summary: ${text.slice(0, 200)}` });
  }),
};

export default aiController;
