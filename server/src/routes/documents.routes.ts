import { Router } from "express";
import multer from "multer";
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
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/applications/:appId/upload",
  upload.single("file"),
  uploadDocument
);
router.get("/applications/:appId/download-all", downloadAllDocumentsHandler);
router.get("/:id", getDocument);
router.get("/:id/preview", previewDocument);
router.get("/:id/download", downloadDocumentHandler);
router.post("/:id/accept", acceptDocumentHandler);
router.post("/:id/reject", rejectDocumentHandler);

export default router;
