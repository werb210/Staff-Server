import { Router } from "express";
import financialsController from "../controllers/financialsController.js";

const router = Router();

// Only ocrForDocument exists
router.get("/document/:documentId", financialsController.ocrForDocument);

export default router;
