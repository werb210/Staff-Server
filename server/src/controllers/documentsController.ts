// server/src/controllers/documentsController.ts

import { Request, Response } from "express";
import { registry } from "../db/registry.js";
import {
  uploadBuffer,
  getPresignedUrl,
  getStream,
} from "../services/azureBlob.js";
import { v4 as uuid } from "uuid";

interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * POST /api/documents/upload
 */
export async function uploadDocument(
  req: FileUploadRequest,
  res: Response
) {
  try {
    const { applicationId } = req.body;

    if (!applicationId || typeof applicationId !== "string") {
      return res.status(400).json({ error: "Missing or invalid applicationId" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const documentId = uuid();

    const blobKey = `apps/${applicationId}/${documentId}/${Date.now()}-${file.originalname}`;

    // Upload to Azure Blob
    await uploadBuffer(blobKey, file.buffer, file.mimetype || "application/octet-stream");

    // Persist DB record
    const saved = await registry.documents.insert({
      applicationId,
      name: file.originalname,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      blobKey,
    });

    return res.status(201).json(saved);
  } catch (err: any) {
    console.error("Upload document error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/documents/:applicationId
 */
export async function listDocuments(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ error: "Missing applicationId" });
    }

    const docs = await registry.documents.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });

    return res.json(docs);
  } catch (err: any) {
    console.error("List documents error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/documents/download/:documentId
 */
export async function getDownloadUrl(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ error: "Missing documentId" });
    }

    const doc = await registry.documents.findUnique({
      where: { id: documentId },
    });

    if (!doc || !doc.blobKey) {
      return res.status(404).json({ error: "Document not found" });
    }

    const url = await getPresignedUrl(doc.blobKey);
    return res.json({ url });
  } catch (err: any) {
    console.error("Get download URL error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/documents/content/:documentId
 */
export async function getDocumentContent(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

    const doc = await registry.documents.findUnique({
      where: { id: documentId },
    });

    if (!doc || !doc.blobKey) {
      return res.status(404).json({ error: "Document not found" });
    }

    const stream = await getStream(doc.blobKey);
    if (!stream) return res.status(404).json({ error: "Blob not found" });

    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    stream.pipe(res);
  } catch (err: any) {
    console.error("Get document content error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /api/documents/:documentId
 */
export async function deleteDocument(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

    const doc = await registry.documents.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    await registry.documents.delete({ where: { id: documentId } });

    return res.status(204).send();
  } catch (err: any) {
    console.error("Delete document error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default {
  uploadDocument,
  listDocuments,
  getDownloadUrl,
  getDocumentContent,
  deleteDocument,
};
