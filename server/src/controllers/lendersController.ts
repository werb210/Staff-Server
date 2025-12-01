import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import lendersRepo from "../db/repositories/lenders.repo.js";

export const lendersController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await lendersRepo.findMany({});
    res.json(rows);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const created = await lendersRepo.create(req.body);
    res.json(created);
  }),
};

export default lendersController;
