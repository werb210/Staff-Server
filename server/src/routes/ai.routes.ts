import { Router } from "express";
import { aiController } from "../controllers/aiController";

const router = Router();

router.post("/summaries", aiController.generateSummary);

export default router;
