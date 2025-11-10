import { Router } from "express";
import { parseDocument } from "../schemas/documentSchema.js";
import { logInfo } from "../utils/logger.js";
import { fetchDocumentStatus, processDocumentUpload } from "../services/documentService.js";
import { saveTemporaryFile } from "../utils/fileHandler.js";

const documentsRouter = Router();

documentsRouter.get("/", (_req, res) => {
  logInfo("GET /api/documents invoked");
  res.json({ message: "List documents not implemented" });
});

documentsRouter.post("/", async (req, res) => {
  logInfo("POST /api/documents invoked");
  const filePath = await saveTemporaryFile(Buffer.from("stub"), "upload.txt");
  const document = await processDocumentUpload(req.body.applicationId ?? "APP-000001", filePath);
  res.status(201).json({ message: "Document uploaded", document: parseDocument({
    id: document.id,
    applicationId: req.body.applicationId ?? "APP-000001",
    name: document.name,
    type: "pdf",
    status: document.status,
    uploadedAt: new Date().toISOString()
  }) });
});

documentsRouter.get("/:id/status", async (req, res) => {
  logInfo("GET /api/documents/:id/status invoked");
  const status = await fetchDocumentStatus(req.params.id);
  res.json({ message: "Document status fetched", status });
});

export default documentsRouter;
