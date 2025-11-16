// server/src/controllers/lendersController.ts
import type { Request, Response } from "express";
import { lenderService } from "../services/lenderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const lendersController = {
  all: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: await lenderService.all() });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const row = await lenderService.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: row });
  }),
};
