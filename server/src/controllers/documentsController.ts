import { Request, Response } from "express";
import documentsRepo from "../db/repositories/documents.repo.js";
import documentVersionsRepo from "../db/repositories/documentVersions.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

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

    res.status(201).json(created);
  }),
};

export default documentsController;
