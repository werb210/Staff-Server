import { logDebug, logInfo } from "../utils/logger.js";

export async function extractTextFromDocument(filePath: string): Promise<string> {
  logInfo("extractTextFromDocument invoked");
  logDebug("extractTextFromDocument payload", { filePath });
  return `Extracted text for ${filePath}`;
}

export async function detectDocumentLanguage(filePath: string): Promise<string> {
  logInfo("detectDocumentLanguage invoked");
  logDebug("detectDocumentLanguage payload", { filePath });
  return "en";
}
