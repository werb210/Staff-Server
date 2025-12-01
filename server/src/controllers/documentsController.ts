// server/src/controllers/documentsController.ts

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as docsRepo from "../db/repositories/documents.repo";
import * as versionsRepo from "../db/repositories/documentVersions.repo";
import { uploadToBlob, getBlobUrl } from "../services/blobService";
import { z } from "zod";

// Validation
const uploadSchema = z.object({
  applicationId: z.string(),
  category: z.string(),
  documentType: z.string(),
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = req.params.applicationId;
  const docs = await docsRepo.getDocumentsByApplication(applicationId);

  res.json({ success: true, data: docs });
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const doc = await docsRepo.getDocumentById(id);

  if (!doc) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  const url = await getBlobUrl(doc.s3Key); // renamed but still stores Azure key
  res.json({ success: true, url });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const parsed = uploadSchema.parse(req.body);

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Missing file" });
  }

  // Upload to Azure Blob
  const buffer = req.file.buffer;
  const extension = req.file.originalname.split(".").pop();
  const key = `applications/${parsed.applicationId}/${Date.now()}.${extension}`;

  await uploadToBlob(buffer, key);

  // Create new DB record
  const created = await docsRepo.createDocument({
    applicationId: parsed.applicationId,
    category: parsed.category,
    documentType: parsed.documentType,
    s3Key: key,
    name: req.file.originalname,
    sizeBytes: buffer.length,
  });

  // Save version entry
  await versionsRepo.createVersion({
    documentId: created.id,
    version: 1,
    s3Key: key,
  });

  res.status(201).json({ success: true, data: created });
});

export const acceptDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const updated = await docsRepo.updateDocument(id, { status: "accepted" });
  if (!updated) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  res.json({ success: true, data: updated });
});

export const rejectDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const updated = await docsRepo.updateDocument(id, { status: "rejected" });
  if (!updated) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  res.json({ success: true, data: updated });
});

export const replaceDocument = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Missing file" });
  }

  const old = await docsRepo.getDocumentById(id);
  if (!old) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }

  const extension = req.file.originalname.split(".").pop();
  const key = `applications/${old.applicationId}/${Date.now()}.${extension}`;

  await uploadToBlob(req.file.buffer, key);

  const updated = await docsRepo.updateDocument(id, {
    s3Key: key,
    name: req.file.originalname,
    sizeBytes: req.file.buffer.length,
    status: "pending",
  });

  await versionsRepo.createVersion({
    documentId: id,
    version: old.version + 1,
    s3Key: key,
  });

  res.json({ success: true, data: updated });
});
