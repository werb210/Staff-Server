// server/src/routes/documents.ts
import { Router } from "express";
import documentsController from "../controllers/documentsController.js";

const router = Router();

// Keep only valid methods
router.get("/:documentId", documentsController.list);
router.post("/", documentsController.upload);

export default router;
