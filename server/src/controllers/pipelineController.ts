import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";

export const pipelineController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  }),

  get: asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  }),

  create: asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  }),

  update: asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  }),

  remove: asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({ ok: false, error: "Pipeline not implemented." });
  }),
};
