// server/src/controllers/documentsController.ts
import type { Request, Response } from "express";
import { documentsService } from "../services/documentsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const documentsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await documentsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await documentsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await documentsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await documentsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await documentsService.delete(req.params.id));
  }),
};
