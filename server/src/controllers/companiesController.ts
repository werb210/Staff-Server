import { Request, Response } from "express";
import companiesRepo from "../db/repositories/companies.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const companiesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const companies = await companiesRepo.findMany({});
    res.json(companies);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;
    const company = await companiesRepo.create(payload);
    res.json(company);
  }),
};

export default companiesController;
