import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import ocrRepo from "../db/repositories/ocrResults.repo.js";
import documentVersionsRepo from "../db/repositories/documentVersions.repo.js";

export const financialsController = {
  ocrForDocument: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const versions = await documentVersionsRepo.findMany({ documentId });
    if (versions.length === 0) return res.status(404).json({ error: "No versions" });

    const ocr = await ocrRepo.findMany({ documentId });
    res.json(ocr);
  }),
};

export default financialsController;
