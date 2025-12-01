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
    const payload = {
      ...req.body,
      azureBlobKey: req.body.azureBlobKey || req.body.url,
    };

    if (!payload.applicationId) {
      return res.status(400).json({ error: "applicationId is required" });
    }

    if (!payload.azureBlobKey) {
      return res.status(400).json({ error: "azureBlobKey is required" });
    }

    res.json(await documentsService.create(payload));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const payload = {
      ...req.body,
      azureBlobKey: req.body.azureBlobKey || req.body.url,
    };

    res.json(await documentsService.update(req.params.id, payload));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await documentsService.delete(req.params.id));
  }),
};
