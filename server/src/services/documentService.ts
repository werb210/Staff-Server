import { randomUUID } from "node:crypto";
import { documentStatusSchema, type DocumentStatus, type DocumentUploadInput } from "../schemas/document.schema.js";
import { uploadToS3 } from "../utils/s3Storage.js";

/**
 * Service responsible for persisting and retrieving document metadata.
 * This stub stores data in memory for ease of testing.
 */
class DocumentService {
  private documents = new Map<string, DocumentStatus>();

  /**
   * Simulates uploading a document to S3 and returns normalized metadata.
   */
  async uploadDocument(payload: DocumentUploadInput): Promise<DocumentStatus> {
    const buffer = Buffer.from(payload.content, "base64");
    await uploadToS3(buffer, { bucket: "stub", key: `${payload.applicationId}/${payload.fileName}`, region: "us-east-1" }, payload.mimeType);

    const document = documentStatusSchema.parse({
      id: randomUUID(),
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      status: "processing",
      uploadedAt: new Date().toISOString()
    });

    this.documents.set(document.id, document);
    return document;
  }

  /**
   * Returns the current status for a document if present.
   */
  async getDocumentStatus(id: string): Promise<DocumentStatus | undefined> {
    return this.documents.get(id);
  }
}

export const documentService = new DocumentService();
