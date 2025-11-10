import { Router } from "express";
import { documentUploadSchema } from "../schemas/document.schema.js";
import type { DocumentUploadInput } from "../schemas/document.schema.js";
import { documentService } from "../services/documentService.js";
import { logInfo } from "../utils/logger.js";

/**
 * Router exposing minimal document endpoints required for integration tests.
 */
const documentsRouter = Router();

/**
 * POST /api/documents
 * Accepts a base64 encoded document payload and stores a stub record.
 */
documentsRouter.post("/", async (req, res) => {
  logInfo("POST /api/documents invoked");

  const parsedPayload = documentUploadSchema.safeParse(req.body);
  if (!parsedPayload.success) {
    res.status(400).json({
      message: "Invalid document payload",
      issues: parsedPayload.error.flatten().fieldErrors
    });
    return;
  }

  const uploadInput: DocumentUploadInput = parsedPayload.data;
  const document = await documentService.uploadDocument(uploadInput);

  res.status(201).json({
    message: "Document uploaded",
    document
  });
});

/**
 * GET /api/documents/:id/status
 * Returns the simulated processing status for an uploaded document.
 */
documentsRouter.get("/:id/status", async (req, res) => {
  logInfo("GET /api/documents/:id/status invoked");

  const document = await documentService.getDocumentStatus(req.params.id);
  if (!document) {
    res.status(404).json({ message: "Document not found" });
    return;
  }

  res.json({
    message: "Document status retrieved",
    document
  });
});

export default documentsRouter;
