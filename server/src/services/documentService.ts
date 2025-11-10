import { randomUUID } from "node:crypto";
import { calculateChecksum } from "../utils/checksum.js";
import { azureBlobClient } from "../utils/azureBlobStorage.js";
import {
  documentSchema,
  parseDocument,
  parseUploadDocumentInput,
  type Document,
  type UploadDocumentInput
} from "../schemas/document.schema.js";

class DocumentService {
  private readonly documents = new Map<string, Document>();

  listDocuments(): Document[] {
    return Array.from(this.documents.values()).map((document) => ({ ...document }));
  }

  async uploadDocument(input: unknown): Promise<Document> {
    const payload: UploadDocumentInput = parseUploadDocumentInput(input);
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(payload.content.trim());
    const data = Buffer.from(payload.content, isBase64 ? "base64" : "utf-8");
    const uploadResult = await azureBlobClient.upload({
      container: payload.applicationId,
      blobName: `${payload.name.replace(/\s+/g, "-")}-${Date.now()}`,
      data,
      contentType: payload.mimeType,
      metadata: payload.metadata
    });

    const document: Document = documentSchema.parse({
      id: randomUUID(),
      applicationId: payload.applicationId,
      name: payload.name,
      type: payload.type,
      mimeType: payload.mimeType,
      url: uploadResult.url,
      checksum: calculateChecksum(data),
      uploadedAt: uploadResult.uploadedAt,
      status: "received"
    });

    this.documents.set(document.id, document);
    return parseDocument(document);
  }
}

export const documentService = new DocumentService();
export type { Document } from "../schemas/document.schema.js";
