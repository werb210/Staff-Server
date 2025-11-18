// FILE: server/src/controllers/dealsController.ts
import { Request, Response } from "express";
import dealsService from "../services/dealsService.js";

export const getDeals = async (_req: Request, res: Response) => {
  res.json(await dealsService.getDeals());
};

export const createDeal = async (req: Request, res: Response) => {
  res.status(201).json(await dealsService.createDeal(req.body));
};

export default { getDeals, createDeal };
