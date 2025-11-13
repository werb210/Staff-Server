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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------------------------------------
   DOCUMENT-SCOPED ROUTES
--------------------------------------------------------- */

router.get("/:id", getDocument);

router.get("/:id/preview", previewDocument);

router.get("/:id/download", downloadDocumentHandler);

router.post("/:id/accept", acceptDocumentHandler);

router.post("/:id/reject", rejectDocumentHandler);

router.post("/:id/reupload", upload.single("file"), reuploadDocumentHandler);

/* ---------------------------------------------------------
   CREATE NEW DOCUMENT
--------------------------------------------------------- */

router.post("/upload", upload.single("file"), uploadDocument);

/* ---------------------------------------------------------
   APPLICATION-SCOPED ROUTES
   (used via: applicationDocumentsRouter in index.ts)
--------------------------------------------------------- */

export const applicationDocumentsRouter = Router({ mergeParams: true });

applicationDocumentsRouter.get(
  "/:appId/documents",
  getDocumentsForApplicationHandler
);

applicationDocumentsRouter.get(
  "/:appId/documents/download-all",
  downloadAllDocumentsHandler
);

export default router;
