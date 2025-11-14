import { Router } from "express";
import {
  generateAISummary,
  generateAIInsights,
} from "../controllers/ai/aiController.js";

const router = Router();

// /ai/:appId/summary
router.get("/:appId/summary", generateAISummary);

// /ai/:appId/insights
router.get("/:appId/insights", generateAIInsights);

export default router;
