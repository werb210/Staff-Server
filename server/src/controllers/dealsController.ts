import type { Request, Response } from "express";
import { dealsService } from "../services/dealsService";
import asyncHandler from "../utils/asyncHandler";

export const dealsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await dealsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await dealsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await dealsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await dealsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await dealsService.remove(req.params.id));
  }),
};
