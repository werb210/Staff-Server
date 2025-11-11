import { Router } from "express";
import { documentService } from "../../../services/documentService.js";
import { DocumentUploadSchema } from "../../../schemas/document.schema.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

// Allows the front-end to register a document upload against an application.
router.post("/", (req, res) => {
  try {
    const payload = DocumentUploadSchema.parse(req.body);
    logInfo("Registering document upload", payload);
    const stored = documentService.saveDocument({
      id: payload.documentId,
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      contentType: payload.contentType,
      status: "processing",
    });
    const upload = documentService.generateUploadUrl(
      payload.documentId,
      payload.fileName,
    );
    res.status(201).json({ message: "OK", data: { metadata: stored, upload } });
  } catch (error) {
    logError("Failed to register document upload", error);
    res.status(400).json({ message: "Unable to register document" });
  }
});

export default router;
