// server/src/routes/ai.routes.ts

import { Router } from "express";
import { aiController } from "../controllers/aiController.js";

const router = Router();

router.post("/summary", aiController.generateSummary);

export default router;
