// routes/ai.routes.js
// -----------------------------------------------------
// AI routes (GLOBAL — not silo-scoped)
// Mounted at: /api/ai
// -----------------------------------------------------

import { Router } from "express";
import {
  aiPing,
  aiSummarize,
  aiExtractFields,
} from "../controllers/aiController.js";

const router = Router();

// -----------------------------------------------------
// Async wrapper (Express 5-safe)
// -----------------------------------------------------
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------

// Health check for AI engine
router.get("/ping", wrap(aiPing));

// Simple text summarizer (placeholder)
router.post("/summarize", wrap(aiSummarize));

// Extract key fields (placeholder)
router.post("/extract-fields", wrap(aiExtractFields));

export default router;
