import { Router } from "express";
import { z } from "zod";

import { aiService } from "../../services/aiService.js";

const router = Router();

const ocrRequestSchema = z.object({
  text: z.string().min(1, "OCR text is required")
});

router.get("/", async (req, res, next) => {
  try {
    const queryText = typeof req.query.text === "string" ? req.query.text : "";
    const payload = ocrRequestSchema.parse({ text: queryText || "Sample OCR text" });
    const insights = await aiService.extractInsightsFromOcr(payload.text);
    res.json({ message: "OK", insights });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = ocrRequestSchema.parse(req.body);
    const insights = await aiService.extractInsightsFromOcr(payload.text);
    res.status(201).json({ message: "OK", insights });
  } catch (error) {
    next(error);
  }
});

export default router;
