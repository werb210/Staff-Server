// server/src/controllers/applicationsController.ts
import type { Request, Response } from "express";
import { applicationsService } from "../services/applicationsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const applicationsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await applicationsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await applicationsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await applicationsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await applicationsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await applicationsService.delete(req.params.id));
  }),
};
