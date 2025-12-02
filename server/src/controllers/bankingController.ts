import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import bankingAnalysisRepo from "../db/repositories/bankingAnalysis.repo.js";

export const bankingController = {
  runAnalysis: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const result = await bankingAnalysisRepo.create({
      applicationId,
      data: req.body ?? {},
    });
    res.json(result);
  }),

  getAnalysis: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const row = await bankingAnalysisRepo.findByApplication(applicationId);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  }),
};

export default bankingController;
