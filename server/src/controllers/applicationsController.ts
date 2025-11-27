import type { Request, Response } from "express";
import { applicationsService } from "../services/applicationsService";
import asyncHandler from "../utils/asyncHandler";

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

  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await applicationsService.delete(req.params.id));
  }),
};
