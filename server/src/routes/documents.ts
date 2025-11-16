// server/src/routes/documents.ts

import express from "express";
import multer from "multer";

import {
  uploadDocument,
  listDocuments,
  getDownloadUrl,
  getDocumentContent,
  deleteDocument,
} from "../controllers/documentsController.js";

const router = express.Router();

// Multer memory storage for Azure Blob uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/documents/upload
 * Upload a new document
 */
router.post("/upload", upload.single("file"), uploadDocument);

/**
 * GET /api/documents/download/:documentId
 * Return signed Azure Blob URL
 */
router.get("/download/:documentId", getDownloadUrl);

/**
 * GET /api/documents/content/:documentId
 * Stream raw blob bytes
 */
router.get("/content/:documentId", getDocumentContent);

/**
 * GET /api/documents/:applicationId
 * List all documents for an application
 */
router.get("/:applicationId", listDocuments);

/**
 * DELETE /api/documents/:documentId
 * Delete DB record (blob kept for now)
 */
router.delete("/:documentId", deleteDocument);

export default router;
