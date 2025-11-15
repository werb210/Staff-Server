import type { Request, Response } from "express";
import JSZip from "jszip";
import type { Silo } from "../services/db.js";
import { documentService } from "../services/documentService.js";

/* -----------------------------------------------------
   LOCAL FALLBACK TYPES
----------------------------------------------------- */

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
  stream?: NodeJS.ReadableStream;
}

type TypedRequestWithFile = Request & {
  file?: UploadedFile;
  user?: { id?: string };
};

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

  const doc = documentService.create(silo, {
    applicationId: appId,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    content: req.file.buffer,
  });

  return res.status(201).json(doc);
};

/* -----------------------------------------------------
   GET DOCUMENT METADATA
----------------------------------------------------- */

export const getDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const doc = documentService.get(id, silo);
  if (!doc) return res.status(404).json({ error: "Not found" });

  return res.json(doc);
};

/* -----------------------------------------------------
   PREVIEW DOCUMENT (INLINE)
----------------------------------------------------- */

export const previewDocument = async (req: Request, res: Response) => {
  const silo = asSilo(req.params.silo);
  const id = req.params.id;

  const file = documentService.get(id, silo);
  if (!file || !file.content) {
    return res.status(404).json({ error: "Not found" });
  }

  res.setHeader("Content-Type", file.mimeType ?? "application/octet-stream");
  return res.send(file.content);
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

  const file = documentService.get(id, silo);
  if (!file || !file.content) {
    return res.status(404).json({ error: "Not found" });
  }

  res.setHeader("Content-Type", file.mimeType ?? "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${file.name ?? "document"}"`
  );

  return res.send(file.content);
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

  const updated = documentService.update(silo, id, {
    accepted: true,
    acceptedBy: req.user?.id ?? "system",
    rejected: false,
    rejectedBy: null,
  });

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

  const updated = documentService.update(silo, id, {
    rejected: true,
    rejectedBy: req.user?.id ?? "system",
    accepted: false,
    acceptedBy: null,
  });

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

  const docs = documentService.list(appId, silo);
  if (docs.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  const zip = new JSZip();
  docs.forEach((doc) => {
    if (doc.content) {
      zip.file(doc.name ?? `${doc.id}.bin`, doc.content);
    }
  });

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${appId}-documents.zip"`
  );

  return res.send(zipBuffer);
};
