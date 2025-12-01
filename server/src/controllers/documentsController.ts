import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import documentsRepo from "../db/repositories/documents.repo.js";
import documentVersionsRepo from "../db/repositories/documentVersions.repo.js";

export const documentsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const docs = await documentsRepo.findMany({ applicationId });
    res.json(docs);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const created = await documentsRepo.create(req.body);
    await documentVersionsRepo.create({
      documentId: created.id,
      versionNumber: 1,
      azureBlobKey: created.azureBlobKey,
      checksum: created.checksum,
      sizeBytes: created.sizeBytes,
    });
    res.json(created);
  }),
};

export default documentsController;
