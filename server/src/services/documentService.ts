import { logDebug, logInfo } from "../utils/logger.js";
import type { DocumentRequirement } from "../types/documentRequirement.js";

export async function processDocumentUpload(applicationId: string, filePath: string): Promise<DocumentRequirement> {
  logInfo("processDocumentUpload invoked");
  logDebug("processDocumentUpload payload", { applicationId, filePath });
  return {
    id: `DOC-${Date.now()}`,
    name: "Uploaded Document",
    description: "Stubbed document upload",
    required: true,
    status: "received"
  };
}

export async function fetchDocumentStatus(documentId: string): Promise<string> {
  logInfo("fetchDocumentStatus invoked");
  logDebug("fetchDocumentStatus payload", { documentId });
  return "processing";
}

export async function listApplicationDocuments(applicationId: string): Promise<DocumentRequirement[]> {
  logInfo("listApplicationDocuments invoked");
  logDebug("listApplicationDocuments payload", { applicationId });
  return [
    {
      id: "DOC-001",
      name: "Government ID",
      description: "Government-issued identification",
      required: true,
      status: "pending"
    }
  ];
}
