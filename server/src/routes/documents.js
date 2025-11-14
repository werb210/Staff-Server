// routes/documents.js
// -----------------------------------------------------
// Global Documents Routes (NOT silo-based)
// Mounted at: /api/documents
// -----------------------------------------------------

import { Router } from "express";
import {
  getDocuments,
  uploadDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
} from "../controllers/documentsController.js";

const router = Router();

// -----------------------------------------------------
// Async wrapper (Express 5-safe)
// -----------------------------------------------------
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// Param validator
// -----------------------------------------------------
router.param("documentId", (req, res, next, value) => {
  if (!value || typeof value !== "string" || value.length < 6) {
    return res.status(400).json({
      ok: false,
      error: "Invalid document ID",
      received: value,
    });
  }
  next();
});

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------

// GET all documents
router.get("/", wrap(getDocuments));

// UPLOAD new document
router.post("/", wrap(uploadDocument));

// GET single document metadata
router.get("/:documentId", wrap(getDocumentById));

// UPDATE metadata (tags, description, version notes)
router.put("/:documentId", wrap(updateDocument));

// DELETE a document (soft delete recommended)
router.delete("/:documentId", wrap(deleteDocument));

// DOWNLOAD document binary / presigned URL
router.get("/:documentId/download", wrap(downloadDocument));

export default router;
