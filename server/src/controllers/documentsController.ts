// server/src/controllers/documentsController.ts

import { Request, Response } from "express";
import * as documentsRepo from "../db/repositories/documents.repo";
import { uploadToAzureBlob } from "../utils/blob";
import { asyncHandler } from "../utils/asyncHandler";
import { z } from "zod";

const uploadSchema = z.object({
  applicationId: z.string(),
  category: z.string(),
  documentType: z.string().optional(),
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const appId = req.params.applicationId;
  const docs = await documentsRepo.getDocumentsForApplication(appId);
  res.json({ success: true, data: docs });
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const doc = await documentsRepo.getDocumentById(id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  res.json({ success: true, data: doc });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const parsed = uploadSchema.parse(req.body);

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Missing file" });
  }

  const blob = await uploadToAzureBlob(req.file);

  const created = await documentsRepo.createDocument({
    applicationId: parsed.applicationId,
    category: parsed.category,
    documentType: parsed.documentType ?? null,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storageKey: blob.blobName,
    url: blob.url,
  });

  res.status(201).json({ success: true, data: created });
});

export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const updated = await documentsRepo.updateDocument(id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: "Document not found" });

  res.json({ success: true, data: updated });
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const deleted = await documentsRepo.deleteDocument(id);
  if (!deleted) return res.status(404).json({ success: false, message: "Document not found" });

  res.json({ success: true, data: true });
});
