import type { Request, Response } from "express";
import { productsService } from "../services/productsService";
import asyncHandler from "../utils/asyncHandler";

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

  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productsService.delete(req.params.id));
  }),
};
