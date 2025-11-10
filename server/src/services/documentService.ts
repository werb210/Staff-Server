import { DocumentSchema } from "../schemas/documentSchema.js";
import type { DocumentSchemaType } from "../schemas/documentSchema.js";
import { logDebug, logInfo } from "../utils/logger.js";
import type { DocumentRequirement } from "../types/documentRequirement.js";

/**
 * Persists a document upload for an application and returns the resulting requirement record.
 */
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

/**
 * Retrieves the current processing status for a document.
 */
export async function fetchDocumentStatus(documentId: string): Promise<string> {
  logInfo("fetchDocumentStatus invoked");
  logDebug("fetchDocumentStatus payload", { documentId });
  return "processing";
}

/**
 * Returns the list of documents that have been associated with an application.
 */
export async function listApplicationDocuments(applicationId: string): Promise<DocumentSchemaType[]> {
  logInfo("listApplicationDocuments invoked");
  logDebug("listApplicationDocuments payload", { applicationId });
  return [
    DocumentSchema.parse({
      id: "DOC-001",
      applicationId,
      name: "Government ID",
      type: "pdf",
      status: "pending",
      uploadedAt: new Date().toISOString()
    })
  ];
}
