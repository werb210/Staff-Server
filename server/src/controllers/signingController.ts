import { Request, Response } from "express";
import documentsRepo from "../db/repositories/documents.repo.js";
import signaturesRepo from "../db/repositories/signatures.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const signingController = {
  requestSignature: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const payload = req.body ?? {};

    const created = await signaturesRepo.create({
      applicationId,
      details: payload,
    });

    res.status(201).json(created);
  }),

  listForApplication: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const signatures = await signaturesRepo.findMany({ applicationId });
    res.json(signatures);
  }),

  getSignedDocuments: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const documents = await documentsRepo.findMany({
      applicationId,
      category: "signed_application",
    });

    res.json(documents);
  }),
};

export default signingController;
