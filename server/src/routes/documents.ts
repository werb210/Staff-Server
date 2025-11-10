import { Router } from "express";
import { ZodError, z } from "zod";
import { parseDocument } from "../schemas/documentSchema.js";
import { logInfo } from "../utils/logger.js";
import {
  DocumentNotFoundError,
  fetchDocumentStatus,
  processDocumentUpload
} from "../services/documentService.js";

const documentsRouter = Router();

/**
 * Handles GET /api/documents by returning a placeholder response for list operations.
 */
documentsRouter.get("/", (_req, res) => {
  logInfo("GET /api/documents invoked");
  res.json({ message: "List documents not implemented" });
});

const uploadSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  fileName: z.string().min(1, "fileName is required"),
  mimeType: z.string().min(1, "mimeType is required"),
  content: z.string().min(1, "content is required")
});

/**
 * Handles POST /api/documents by accepting a base64 payload and delegating to the document service.
 */
documentsRouter.post("/", async (req, res) => {
  logInfo("POST /api/documents invoked");
  try {
    const payload = uploadSchema.parse(req.body);
    const base64Content = payload.content.includes(",") ? payload.content.split(",").pop() ?? "" : payload.content;
    const buffer = Buffer.from(base64Content, "base64");
    if (buffer.byteLength === 0) {
      res.status(400).json({ message: "content must be a base64 encoded file" });
      return;
    }
    const document = await processDocumentUpload({
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      content: buffer
    });
    const sanitizedDocument = parseDocument(document);
    res.status(201).json({
      document: {
        ...sanitizedDocument,
        description: document.description,
        required: document.required,
        checksum: document.checksum,
        mimeType: document.mimeType,
        url: document.url,
        storageKey: document.storageKey,
        size: document.size,
        lastUpdatedAt: document.lastUpdatedAt
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Invalid document upload payload",
        error: error.message
      });
      return;
    }
    res.status(500).json({
      message: "Failed to upload document",
      error: (error as Error).message
    });
  }
});

/**
 * Handles GET /api/documents/:id/status by returning the processing status of a document.
 */
documentsRouter.get("/:id/status", async (req, res) => {
  logInfo("GET /api/documents/:id/status invoked");
  try {
    const document = await fetchDocumentStatus(req.params.id);
    const sanitizedDocument = parseDocument(document);
    res.json({
      status: document.status,
      document: {
        ...sanitizedDocument,
        description: document.description,
        required: document.required,
        checksum: document.checksum,
        mimeType: document.mimeType,
        url: document.url,
        storageKey: document.storageKey,
        size: document.size,
        lastUpdatedAt: document.lastUpdatedAt
      }
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Unable to retrieve document status" });
  }
});

export default documentsRouter;
