import { createSummary } from "../utils/aiHelpers.js";

interface OcrResult {
  text: string;
  confidence: number;
  summary: string;
}

class OcrService {
  public analyze(content: string | Buffer): OcrResult {
    const text = typeof content === "string" ? content : content.toString("utf-8");
    const normalized = text.trim() || "Document received";
    return {
      text: normalized,
      confidence: 0.92,
      summary: createSummary(normalized),
    };
  }
}

export const ocrService = new OcrService();

export type OcrServiceType = OcrService;
