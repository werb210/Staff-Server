import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { documentService } from "../services/documentService.js";

// -----------------------------------------------------
// Local type helpers (fixes all TS errors in CI)
// -----------------------------------------------------
interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface AuthUser {
  id: string;
  role?: string;
}

interface TypedRequestWithFile extends Request {
  file?: UploadedFile;
  user?: AuthUser;
}

const asSilo = (v: string): Silo => v as Silo;

// -----------------------------------------------------
// UPLOAD DOCUMENT
// -----------------------------------------------------
export const uploadDocument = async (req: TypedRequestWithFile, res: Response) => {
  const silo = asSilo(req.params.silo);
  const appId = req.params.appId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const doc = await documentService.upload(silo, appId, file as any);
  if (!doc) {
    return res.status(404).json({ error: "Application not found or silo blocked" });
  }

  return res.status(201).json(doc);
};

// -----------------------------------------------------
// GET DOCUMENT METADATA
// -----------------------------------------------------
export const getDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const doc = await documentService.get(silo, id);
  if (!doc) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(doc);
};

// -----------------------------------------------------
// PREVIEW DOCUMENT
// -----------------------------------------------------
export const previewDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const file = await documentService.download(silo, id);
  if (!file) {
    return res.status(404).json({ error: "Not found" });
  }

  res.setHeader("Content-Type", file.mimeType);
  return res.send(file.buffer);
};

// -----------------------------------------------------
// DOWNLOAD SINGLE DOCUMENT
// -----------------------------------------------------
export const downloadDocumentHandler = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.download(silo, id);
  if (!result) {
    return res.status(404).json({ error: "Not found" });
  }

  res.setHeader("Content-Type", result.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.name}"`);
  return res.send(result.buffer);
};

// -----------------------------------------------------
// ACCEPT DOCUMENT
// -----------------------------------------------------
export const acceptDocumentHandler = async (req: TypedRequestWithFile, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.accept(
    silo,
    id,
    req.user?.id ?? "system"
  );

  if (!result) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(result);
};

// -----------------------------------------------------
// REJECT DOCUMENT
// -----------------------------------------------------
export const rejectDocumentHandler = async (req: TypedRequestWithFile, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.reject(
    silo,
    id,
    req.user?.id ?? "system"
  );

  if (!result) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(result);
};

// -----------------------------------------------------
// DOWNLOAD ZIP OF ALL DOCUMENTS
// -----------------------------------------------------
export const downloadAllDocumentsHandler = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const appId = req.params.appId;

  const result = await documentService.downloadAll(silo, appId);
  if (!result) {
    return res.status(404).json({ error: "Not found" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.fileName}"`
  );

  return res.send(result.zipBuffer);
};
