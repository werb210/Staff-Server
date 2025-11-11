import { randomUUID } from "crypto";
import {
  DocumentQuerySchema,
  DocumentStatusUpdateSchema,
  DocumentUploadInput,
} from "../schemas/documentSchemas.js";
import { uploadToAzureBlob } from "../utils/azureBlob.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";
import { Document } from "../types/index.js";

class DocumentsService {
  private documents = new Map<string, Document>();

  constructor() {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.documents.set(id, {
      id,
      applicationId: randomUUID(),
      type: "bank_statement",
      filename: "statement.pdf",
      content: "",
      url: `https://example.blob.core.windows.net/documents/${id}`,
      status: "uploaded",
      uploadedAt: now,
    });
  }

  async uploadDocument(payload: DocumentUploadInput): Promise<Document> {
    logInfo("Uploading document", { applicationId: payload.applicationId, type: payload.type });
    const blob = await uploadToAzureBlob(payload.content, { container: "documents" });
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const document: Document = {
      ...payload,
      id,
      url: blob.url,
      status: "uploaded",
      uploadedAt: timestamp,
    };
    this.documents.set(id, document);
    return document;
  }

  listDocuments(query: unknown): Document[] {
    const filters = parseWithSchema(DocumentQuerySchema, query);
    logInfo("Listing documents", filters);
    const items = Array.from(this.documents.values());
    return filters.applicationId
      ? items.filter((item) => item.applicationId === filters.applicationId)
      : items;
  }

  updateDocumentStatus(id: string, update: unknown): Document {
    const payload = parseWithSchema(DocumentStatusUpdateSchema, update);
    logInfo("Updating document status", { id, status: payload.status });
    const document = this.getDocumentOrThrow(id);
    const updated: Document = {
      ...document,
      status: payload.status,
      uploadedAt: document.uploadedAt,
    };
    this.documents.set(id, updated);
    return updated;
  }

  deleteDocument(id: string): boolean {
    logInfo("Deleting document", { id });
    return this.documents.delete(id);
  }

  getDocument(id: string): Document {
    logInfo("Fetching document", { id });
    return this.getDocumentOrThrow(id);
  }

  private getDocumentOrThrow(id: string): Document {
    const document = this.documents.get(id);
    if (!document) {
      throw new Error(`Document ${id} not found`);
    }
    return document;
  }
}

export const documentsService = new DocumentsService();
