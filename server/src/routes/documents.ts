import { Router } from "express";
import { documentService } from "../services/documentService.js";
import {
  DocumentSaveSchema,
  DocumentStatusResponseSchema,
  DocumentStatusUpdateSchema,
} from "../schemas/document.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/documents
 * Example: curl "http://localhost:5000/api/documents?applicationId=<id>"
 */
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

/**
 * GET /api/documents/:id
 * Example: curl http://localhost:5000/api/documents/<id>
 */
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

/**
 * POST /api/documents
 * Example: curl -X POST http://localhost:5000/api/documents \
 *   -H 'Content-Type: application/json' \
 *   -d '{"applicationId":"<id>","fileName":"statement.pdf","contentType":"application/pdf"}'
 */
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

/**
 * POST /api/documents/:id/status
 * Example: curl -X POST http://localhost:5000/api/documents/<id>/status \
 *   -H 'Content-Type: application/json' -d '{"status":"review"}'
 */
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

/**
 * GET /api/documents/:id/status
 * Example: curl http://localhost:5000/api/documents/<id>/status
 */
router.get("/:id/status", (req, res) => {
  try {
    logInfo("Fetching document status", { id: req.params.id });
    const status = documentService.getDocumentStatus(req.params.id);
    const payload = DocumentStatusResponseSchema.parse(status);
    res.json({ message: "OK", data: payload });
  } catch (error) {
    logError("Failed to fetch document status", error);
    res.status(400).json({ message: "Unable to fetch document status" });
  }
});

/**
 * GET /api/documents/:id/versions
 * Example: curl http://localhost:5000/api/documents/<id>/versions
 */
router.get("/:id/versions", (req, res) => {
  try {
    logInfo("Listing document versions", { id: req.params.id });
    const versions = documentService.listVersions(req.params.id);
    res.json({ message: "OK", data: versions });
  } catch (error) {
    logError("Failed to list document versions", error);
    res.status(400).json({ message: "Unable to fetch versions" });
  }
});

/**
 * GET /api/documents/:id/download
 * Example: curl "http://localhost:5000/api/documents/<id>/download?version=1"
 */
router.get("/:id/download", (req, res) => {
  try {
    const version = req.query.version
      ? Number.parseInt(String(req.query.version), 10)
      : undefined;
    logInfo("Generating download URL", { id: req.params.id, version });
    const download = documentService.getDownloadUrl(req.params.id, version);
    res.json({ message: "OK", data: download });
  } catch (error) {
    logError("Failed to generate download URL", error);
    res.status(400).json({ message: (error as Error).message });
  }
});

/**
 * POST /api/documents/:id/upload-url
 * Example: curl -X POST http://localhost:5000/api/documents/<id>/upload-url \
 *   -H 'Content-Type: application/json' -d '{"fileName":"statement.pdf"}'
 */
router.post("/:id/upload-url", (req, res) => {
  try {
    const fileName =
      typeof req.body.fileName === "string" ? req.body.fileName : "upload.bin";
    logInfo("Generating upload URL", { id: req.params.id, fileName });
    const upload = documentService.generateUploadUrl(req.params.id, fileName);
    res.json({ message: "OK", data: upload });
  } catch (error) {
    logError("Failed to generate upload URL", error);
    res.status(400).json({ message: "Unable to generate upload URL" });
  }
});

export default router;
