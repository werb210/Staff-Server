// server/src/controllers/signingController.ts

import { Request, Response } from "express";
import documentsRepo from "../db/repositories/documents.repo.js";
import signaturesRepo from "../db/repositories/signatures.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const signingController = {
  requestSignature: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;

    // Only fields allowed by schema:
    // applicationId, signNowDocumentId, signedBlobKey
    const { signNowDocumentId, signedBlobKey } = req.body;

    const created = await signaturesRepo.create({
      applicationId,
      signNowDocumentId: signNowDocumentId ?? null,
      signedBlobKey: signedBlobKey ?? null,
    });

    return res.status(201).json(created);
  }),

  listForApplication: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const signatures = await signaturesRepo.findMany({ applicationId });
    return res.json(signatures);
  }),

  getSignedDocuments: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;

    const docs = await documentsRepo.findMany({
      applicationId,
      category: "signed_application",
    });

    return res.json(docs);
  }),
};

export default signingController;
