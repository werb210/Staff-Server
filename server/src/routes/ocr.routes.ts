import { Router } from "express";
import ocrExtractController from "../controllers/ocrExtractController";

const router = Router();

router.post("/extract", ocrExtractController.extractText);
router.post("/get-tables", ocrExtractController.getTablesFromDocument);
router.post("/classify", ocrExtractController.classifyDocumentType);
router.post("/extract-fields", ocrExtractController.extractStructuredFields);

export default router;
