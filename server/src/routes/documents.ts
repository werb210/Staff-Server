import { Router } from "express";
import { documentService } from "../services/documentService.js";
import {
  DocumentSaveSchema,
  DocumentStatusUpdateSchema,
} from "../schemas/document.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

// Returns metadata for all documents stored in memory.
router.get("/", (req, res) => {
  try {
    const applicationId = req.query.applicationId as string | undefined;
    logInfo("Listing documents", { applicationId });
    const documents = documentService.listDocuments(applicationId);
    res.json({ message: "OK", data: documents });
  } catch (error) {
    logError("Failed to list documents", error);
    res.status(400).json({ message: "Unable to fetch documents" });
  }
});

// Retrieves metadata for a single document.
router.get("/:id", (req, res) => {
  try {
    logInfo("Fetching document", { id: req.params.id });
    const document = documentService.getDocument(req.params.id);
    res.json({ message: "OK", data: document });
  } catch (error) {
    logError("Failed to fetch document", error);
    res.status(400).json({ message: "Unable to fetch document" });
  }
});

// Accepts an upload request and stores document metadata in memory.
router.post("/", (req, res) => {
  try {
    const payload = DocumentSaveSchema.parse(req.body);
    logInfo("Saving document metadata", { fileName: payload.fileName });
    const stored = documentService.saveDocument(payload);
    res.status(201).json({ message: "OK", data: stored });
  } catch (error) {
    logError("Failed to save document", error);
    res.status(400).json({ message: "Invalid document payload" });
  }
});

// Updates the status of a document, e.g. to mark it as reviewed.
router.post("/:id/status", (req, res) => {
  try {
    const payload = DocumentStatusUpdateSchema.parse({
      id: req.params.id,
      status: req.body.status,
      reviewedBy: req.body.reviewedBy,
    });
    logInfo("Updating document status", payload);
    const updated = documentService.updateStatus(payload.id, payload.status);
    res.json({ message: "OK", data: updated });
  } catch (error) {
    logError("Failed to update document status", error);
    res.status(400).json({ message: "Unable to update document" });
  }
});

// Returns the most recent processing status for a document.
router.get("/:id/status", (req, res) => {
  try {
    logInfo("Fetching document status", { id: req.params.id });
    const status = documentService.getDocumentStatus(req.params.id);
    res.json({ message: "OK", data: status });
  } catch (error) {
    logError("Failed to fetch document status", error);
    res.status(400).json({ message: "Unable to fetch document status" });
  }
});

// Generates an upload URL for a document so the UI can send files directly to Blob storage.
router.post("/:id/upload-url", (req, res) => {
  try {
    const fileName = typeof req.body.fileName === "string" ? req.body.fileName : "upload.bin";
    logInfo("Generating upload URL", { id: req.params.id, fileName });
    const upload = documentService.generateUploadUrl(req.params.id, fileName);
    res.json({ message: "OK", data: upload });
  } catch (error) {
    logError("Failed to generate upload URL", error);
    res.status(400).json({ message: "Unable to generate upload URL" });
  }
});

export default router;
