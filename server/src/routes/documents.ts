import { Router } from "express";
import multer from "multer";

import {
  acceptDocumentHandler,
  rejectDocumentHandler,
  reuploadDocumentHandler,
  uploadDocument,
  downloadDocumentHandler,
  downloadAllDocumentsHandler,
  previewDocument,
  getDocument,
  getDocumentsForApplicationHandler,
  deleteDocumentHandler,          // ✔ ADDED
} from "../controllers/documentsController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------------------------------------
   MAIN DOCUMENT ROUTES
--------------------------------------------------------- */

router.post("/upload", upload.single("file"), uploadDocument);

router.get("/:id", getDocument);
router.get("/:id/preview", previewDocument);
router.get("/:id/download", downloadDocumentHandler);

router.post("/:id/accept", acceptDocumentHandler);
router.post("/:id/reject", rejectDocumentHandler);
router.post("/:id/reupload", upload.single("file"), reuploadDocumentHandler);

router.delete("/:id", deleteDocumentHandler);   // ✔ ADDED & WIRED UP

/* ---------------------------------------------------------
   APPLICATION-SCOPED ROUTES
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
