import { Request, Response } from "express";
import bankingRepo from "../db/repositories/bankingAnalysis.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const bankingController = {
  getForApp: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const entries = await bankingRepo.findMany({ applicationId });
    res.json(entries);
  }),
};

export default bankingController;
