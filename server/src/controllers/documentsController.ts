import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { documentService } from "../services/documentService.js";
import type { JwtUserPayload } from "../middlewares/auth.js";

/* -----------------------------------------------------
   LOCAL FALLBACK TYPES
----------------------------------------------------- */

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface TypedRequestWithFile extends Request {
  file?: UploadedFile;
  user?: JwtUserPayload;
}

/** Convert string → Silo (no validation here) */
const asSilo = (v: string): Silo => v as Silo;

/* -----------------------------------------------------
   UPLOAD DOCUMENT (NO MULTER)
----------------------------------------------------- */

export const uploadDocument = async (
  req: TypedRequestWithFile,
  res: Response
) => {
  const silo = asSilo(req.params.silo);
  const appId = req.params.appId;

  if (!req.file) {
    return res.status(400).json({
      error:
        "File upload unavailable — multer is not installed in this environment",
    });
  }

  const doc = await documentService.upload(silo, appId, req.file);
  if (!doc) {
    return res.status(404).json({
      error: "Application not found or silo blocked",
    });
  }

  return res.status(201).json(doc);
};

/* -----------------------------------------------------
   GET DOCUMENT METADATA
----------------------------------------------------- */

export const getDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const doc = await documentService.get(silo, id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  return res.json(doc);
};

/* -----------------------------------------------------
   PREVIEW DOCUMENT (INLINE)
----------------------------------------------------- */

export const previewDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const file = await documentService.download(silo, id);
  if (!file) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", file.mimeType);
  return res.send(file.buffer);
};

/* -----------------------------------------------------
   DOWNLOAD SINGLE DOCUMENT
----------------------------------------------------- */

export const downloadDocumentHandler = async (
  req: Request,
  res: Response
) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const file = await documentService.download(silo, id);
  if (!file) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${file.name}"`
  );

  return res.send(file.buffer);
};

/* -----------------------------------------------------
   ACCEPT DOCUMENT
----------------------------------------------------- */

export const acceptDocumentHandler = async (
  req: TypedRequestWithFile,
  res: Response
) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const updated = await documentService.accept(
    silo,
    id,
    req.user?.id ?? "system"
  );

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json(updated);
};

/* -----------------------------------------------------
   REJECT DOCUMENT
----------------------------------------------------- */

export const rejectDocumentHandler = async (
  req: TypedRequestWithFile,
  res: Response
) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const updated = await documentService.reject(
    silo,
    id,
    req.user?.id ?? "system"
  );

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json(updated);
};

/* -----------------------------------------------------
   DOWNLOAD ALL DOCUMENTS (ZIP)
----------------------------------------------------- */

export const downloadAllDocumentsHandler = async (
  req: Request,
  res: Response
) => {
  const silo = asSilo(req.params.silo);
  const appId = req.params.appId;

  const pack = await documentService.downloadAll(silo, appId);
  if (!pack) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${pack.fileName}"`
  );

  return res.send(pack.zipBuffer);
};
