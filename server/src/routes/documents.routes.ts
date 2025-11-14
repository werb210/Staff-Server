import { Router } from "express";
import multer from "multer";

import {
  fetchDocument,
  fetchDocumentsForApplication,
  handleUploadDocument,
  acceptDocument,
  rejectDocument,
} from "../controllers/documents/documentController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// /documents/:id
router.get("/:id", fetchDocument);

// /documents/application/:appId
router.get("/application/:appId", fetchDocumentsForApplication);

// /documents/upload
router.post("/upload", upload.single("file"), handleUploadDocument);

// /documents/:id/accept
router.post("/:id/accept", acceptDocument);

// /documents/:id/reject
router.post("/:id/reject", rejectDocument);

export default router;
