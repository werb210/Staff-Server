import { Router } from "express";
import {
  uploadDocument,
  getDocument,
  previewDocument,
  downloadDocumentHandler,
  acceptDocumentHandler,
  rejectDocumentHandler,
  downloadAllDocumentsHandler,
} from "../controllers/documentsController.js";

const router = Router({ mergeParams: true });

router.post("/:silo/applications/:appId/upload", uploadDocument);
router.get("/:silo/documents/:id", getDocument);
router.get("/:silo/documents/:id/preview", previewDocument);
router.get("/:silo/documents/:id/download", downloadDocumentHandler);
router.post("/:silo/documents/:id/accept", acceptDocumentHandler);
router.post("/:silo/documents/:id/reject", rejectDocumentHandler);
router.get(
  "/:silo/applications/:appId/documents.zip",
  downloadAllDocumentsHandler
);

export default router;
