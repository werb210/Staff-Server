import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import bankingAnalysisRepo from "../db/repositories/bankingAnalysis.repo.js";

export const bankingController = {
  runAnalysis: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;

    const created = await bankingAnalysisRepo.create({
      applicationId,
      data: req.body ?? {},
    });

    res.json(created);
  }),

  getAnalysis: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;

    const rows = await bankingAnalysisRepo.findMany({ applicationId });
    res.json(rows);
  }),
};

export default bankingController;
