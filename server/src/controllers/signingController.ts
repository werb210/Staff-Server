// server/src/controllers/signingController.ts

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as signingRepo from "../db/repositories/signing.repo";
import { getBlobUrl } from "../services/blobService";

export const getSigningStatus = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = req.params.applicationId;
  const status = await signingRepo.getSigningByApplication(applicationId);

  if (!status) {
    return res.json({ success: true, status: "not_started" });
  }

  res.json({ success: true, status });
});

// For client: kickoff signing once all docs accepted
export const startSigning = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = req.params.applicationId;

  const created = await signingRepo.createSigningSession(applicationId);

  res.json({ success: true, data: created });
});

export const getSignedPdf = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = req.params.applicationId;
  const signing = await signingRepo.getSigningByApplication(applicationId);

  if (!signing || !signing.signedPdfKey) {
    return res.status(404).json({ success: false, message: "Signed PDF not found" });
  }

  const url = await getBlobUrl(signing.signedPdfKey);
  res.json({ success: true, url });
});
