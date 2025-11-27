import type { Request, Response } from "express";
import { lendersService } from "../services/lendersService";
import asyncHandler from "../utils/asyncHandler";

export const lendersController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await lendersService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await lendersService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await lendersService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await lendersService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await lendersService.remove(req.params.id));
  }),
};
