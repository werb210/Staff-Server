import { Router } from "express";
import { extractTextFromDocument } from "../../services/ocrService.js";
import { aiService } from "../../services/aiService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filePath = typeof req.query.filePath === "string" ? req.query.filePath : "sample-document.pdf";
    const text = await extractTextFromDocument(filePath);
    const insights = await aiService.extractInsightsFromOcr(text);
    res.json({ data: { text, insights } });
  } catch (error) {
    next(error);
  }
});

export default router;
