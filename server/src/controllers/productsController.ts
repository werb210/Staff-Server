// server/src/controllers/productsController.ts
import type { Request, Response } from "express";
import { productsService } from "../services/productsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const productsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await productsService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productsService.get(req.params.id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productsService.create(req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productsService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productsService.delete(req.params.id));
  }),
};
