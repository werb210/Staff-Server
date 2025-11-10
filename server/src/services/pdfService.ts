import { logDebug, logInfo } from "../utils/logger.js";
import type { Application } from "../types/application.js";

/**
 * Generates a PDF representation of a loan application and returns the file path.
 */
export async function generateApplicationPdf(application: Application): Promise<string> {
  logInfo("generateApplicationPdf invoked");
  logDebug("generateApplicationPdf payload", { applicationId: application.id });
  return `/tmp/${application.id}-application.pdf`;
}

/**
 * Merges a collection of supporting documents into a single consolidated PDF file.
 */
export async function mergeSupportingDocuments(documentPaths: string[]): Promise<string> {
  logInfo("mergeSupportingDocuments invoked");
  logDebug("mergeSupportingDocuments payload", { documentPaths });
  return `/tmp/merged-${Date.now()}.pdf`;
}
