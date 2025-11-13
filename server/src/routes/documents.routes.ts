import { Router } from "express";
import multer from "multer";

import {
  uploadDocument,
  getDocument,
  previewDocument,
  downloadDocumentHandler,
  acceptDocumentHandler,
  rejectDocumentHandler,
  reuploadDocumentHandler,
  getDocumentsForApplicationHandler,
  downloadAllDocumentsHandler,
} from "../controllers/documentController.js";

// Use memory storage — your controllers expect file.buffer
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

/* ---------------------------------------------------------
   APPLICATION-SCOPED ROUTES
   /api/documents/application/:appId/*
--------------------------------------------------------- */
router.get(
  "/application/:appId",
  getDocumentsForApplicationHandler
);

router.get(
  "/application/:appId/download-all",
  downloadAllDocumentsHandler
);

/* ---------------------------------------------------------
   DOCUMENT-SCOPED ROUTES
   /api/documents/:id/*
--------------------------------------------------------- */
router.get("/:id", getDocument);

router.get("/:id/preview", previewDocument);

router.get("/:id/download", downloadDocumentHandler);

router.post(
  "/:id/reupload",
  upload.single("file"),
  reuploadDocumentHandler
);

router.post("/:id/accept", acceptDocumentHandler);

router.post("/:id/reject", rejectDocumentHandler);

/* ---------------------------------------------------------
   UPLOAD NEW DOCUMENT
   /api/documents/upload
--------------------------------------------------------- */
router.post(
  "/upload",
  upload.single("file"),
  uploadDocument
);

export default router;
