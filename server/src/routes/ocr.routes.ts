import { Router } from "express";
import ocrExtractController from "../controllers/ocrExtractController.js";

const router = Router();

router.post("/extract", ocrExtractController.extract);
router.get("/:documentId", ocrExtractController.getByDocument);
router.get("/", ocrExtractController.list);
router.delete("/:documentId", ocrExtractController.remove);

export default router;
