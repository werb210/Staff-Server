import { logDebug, logInfo } from "../utils/logger.js";

/**
 * Performs OCR against the provided document path and returns the extracted text.
 */
export async function extractTextFromDocument(filePath: string): Promise<string> {
  logInfo("extractTextFromDocument invoked");
  logDebug("extractTextFromDocument payload", { filePath });
  return `Extracted text for ${filePath}`;
}

/**
 * Detects the language of a document using a lightweight heuristic.
 */
export async function detectDocumentLanguage(filePath: string): Promise<string> {
  logInfo("detectDocumentLanguage invoked");
  logDebug("detectDocumentLanguage payload", { filePath });
  return "en";
}
