import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import ocrRepo from "../db/repositories/ocrResults.repo.js";

export const ocrController = {
  getForDocument: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const rows = await ocrRepo.findMany({ documentId });
    res.json(rows);
  }),
};

export default ocrController;
