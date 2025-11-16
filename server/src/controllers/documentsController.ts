// server/src/controllers/documentsController.ts

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

export const documentsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: [] });
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const doc = {
      id: Date.now().toString(),
      name: req.body.name,
    };

    res.status(201).json({ ok: true, data: doc });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json({
      ok: true,
      data: { id: req.params.id, name: "Demo Document" },
    });
  }),
};
