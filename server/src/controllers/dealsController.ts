// server/src/controllers/dealsController.ts
import type { Request, Response } from "express";
import { dealsService } from "../services/dealsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dealsController = {
  all: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await dealsService.all() });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const row = await dealsService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  }),
};
