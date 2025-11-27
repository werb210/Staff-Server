import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import financialsService from "../services/financialsService";

const financialsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await financialsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financialsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financialsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financialsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financialsService.remove(req.params.id));
  }),
};

export default financialsController;
