// server/src/controllers/companiesController.ts
import type { Request, Response } from "express";
import { companiesService } from "../services/companiesService";
import asyncHandler from "../utils/asyncHandler";

export const companiesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await companiesService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await companiesService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await companiesService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await companiesService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await companiesService.delete(req.params.id));
  }),
};
