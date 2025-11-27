import type { Request, Response } from "express";
import { usersService } from "../services/usersService";
import asyncHandler from "../utils/asyncHandler";

export const usersController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await usersService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await usersService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await usersService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await usersService.update(req.params.id, req.body));
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await usersService.delete(req.params.id));
  }),
};
