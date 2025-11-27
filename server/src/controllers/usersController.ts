// server/src/controllers/usersController.ts
import type { Request, Response } from "express";
import { usersService } from "../services/usersService.js";
import asyncHandler from "../utils/asyncHandler.js";

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

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await usersService.delete(req.params.id));
  }),
};
