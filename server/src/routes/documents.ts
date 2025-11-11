import { Router } from "express";
import {
  DocumentStatusUpdateSchema,
  DocumentUploadSchema,
} from "../schemas/documentSchemas.js";
import { documentsService } from "../services/documentsService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    logInfo("GET /api/documents", req.query);
    const documents = documentsService.listDocuments(req.query);
    res.json({ message: "OK", data: documents });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    logInfo("GET /api/documents/:id", { id: req.params.id });
    const document = documentsService.getDocument(req.params.id);
    res.json({ message: "OK", data: document });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    logInfo("POST /api/documents", req.body);
    const payload = parseWithSchema(DocumentUploadSchema, req.body);
    const document = await documentsService.uploadDocument(payload);
    res.status(201).json({ message: "OK", data: document });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/status", (req, res, next) => {
  try {
    logInfo("PUT /api/documents/:id/status", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(DocumentStatusUpdateSchema, req.body);
    const document = documentsService.updateDocumentStatus(req.params.id, payload);
    res.json({ message: "OK", data: document });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/documents/:id", { id: req.params.id, body: req.body });
    res.json({ message: "OK", notice: "No update operation defined" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/documents/:id", { id: req.params.id });
    const removed = documentsService.deleteDocument(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

export default router;
