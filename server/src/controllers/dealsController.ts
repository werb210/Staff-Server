import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import lendersRepo from "../db/repositories/lenders.repo.js";
import applicationsRepo from "../db/repositories/applications.repo.js";

export const dealsController = {
  match: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const application = await applicationsRepo.findById(applicationId);
    if (!application) return res.status(404).json({ error: "Not found" });

    const lenders = await lendersRepo.findMany({});
    res.json({ application, lenders });
  }),
};

export default dealsController;
