import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import productsRepo from "../db/repositories/products.repo.js";

export const productsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await productsRepo.findMany({}));
  }),
};

export default productsController;
