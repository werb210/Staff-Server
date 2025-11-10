import { logDebug, logInfo } from "../utils/logger.js";
import type { Application } from "../types/application.js";

export async function generateApplicationPdf(application: Application): Promise<string> {
  logInfo("generateApplicationPdf invoked");
  logDebug("generateApplicationPdf payload", { applicationId: application.id });
  return `/tmp/${application.id}-application.pdf`;
}

export async function mergeSupportingDocuments(documentPaths: string[]): Promise<string> {
  logInfo("mergeSupportingDocuments invoked");
  logDebug("mergeSupportingDocuments payload", { documentPaths });
  return `/tmp/merged-${Date.now()}.pdf`;
}
