import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../auth/authMiddleware.js";
import {
  downloadDocumentContentHandler,
  getDocumentHandler,
  getDocumentStatusHandler,
  getDocumentVersionsHandler,
  getDocumentsForApplicationHandler,
  getDownloadUrlHandler,
  getUploadUrlHandler,
  listDocumentsHandler,
  registerDocumentHandler,
  updateDocumentStatusHandler,
  uploadDocumentHandler,
} from "../controllers/documentController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get("/", listDocumentsHandler);
router.post("/", registerDocumentHandler);
router.post("/upload", upload.single("file"), uploadDocumentHandler);
router.get("/application/:appId", getDocumentsForApplicationHandler);
router.get("/:id", getDocumentHandler);
router.get("/:id/versions", getDocumentVersionsHandler);
router.get("/:id/status", getDocumentStatusHandler);
router.post("/:id/status", updateDocumentStatusHandler);
router.post("/:id/upload-url", getUploadUrlHandler);
router.get("/:id/download", getDownloadUrlHandler);
router.get("/:id/content", downloadDocumentContentHandler);

export default router;
