import { randomUUID } from "crypto";
import {
  type DocumentMetadata,
  type DocumentSaveInput,
  type DocumentStatus,
  type DocumentStatusResponse,
} from "../schemas/document.schema.js";
import { azureBlobStorage } from "../utils/azureBlobStorage.js";
import { createChecksum } from "../utils/checksum.js";
import { aiService } from "./aiService.js";
import { ocrService } from "./ocrService.js";

/**
 * DocumentService tracks uploaded document metadata in memory.
 */
class DocumentService {
  private readonly documents = new Map<string, DocumentMetadata>();

  constructor() {
    const seedDocuments: DocumentMetadata[] = [
      this.buildMetadata({
        id: "9d7c1c70-0d21-4f32-8fd3-bf366d9d14d4",
        applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
        fileName: "bank-statement.pdf",
        contentType: "application/pdf",
        status: "review",
      }),
      this.buildMetadata({
        id: "0c26a565-19cb-47c5-9fde-68a0f6140f8d",
        applicationId: "8c0ca80e-efb6-4b8f-92dd-18de78274b3d",
        fileName: "tax-return-2023.pdf",
        contentType: "application/pdf",
        status: "approved",
      }),
    ];

    seedDocuments.forEach((document) =>
      this.documents.set(document.id, document),
    );
  }

  private buildMetadata(input: Omit<DocumentSaveInput, "status"> & {
    status: DocumentStatus;
  }): DocumentMetadata {
    const id = input.id ?? randomUUID();
    const uploadedAt = new Date().toISOString();
    const blobPath = `${id}/${input.fileName}`;
    const checksum = input.checksum ?? createChecksum(input.fileName);
    const sasUrl = azureBlobStorage.generateSasUrl("documents", blobPath);
    const ocr = ocrService.analyze(input.fileName);
    const summary = input.aiSummary ?? aiService.summarizeDocument({
      fileName: input.fileName,
      ocrTextPreview: ocr.summary,
    });

    const metadata: DocumentMetadata = {
      id,
      applicationId: input.applicationId,
      fileName: input.fileName,
      contentType: input.contentType,
      status: input.status,
      uploadedAt,
      checksum,
      blobUrl:
        input.blobUrl ??
        `https://example.blob.core.windows.net/documents/${blobPath}`,
      sasUrl,
      aiSummary: summary,
      explainability:
        input.explainability ?? aiService.buildDocumentExplainability({
          id,
          applicationId: input.applicationId,
          fileName: input.fileName,
          contentType: input.contentType,
          status: input.status,
          uploadedAt,
          checksum,
          blobUrl:
            input.blobUrl ??
            `https://example.blob.core.windows.net/documents/${blobPath}`,
          sasUrl,
          aiSummary: summary,
          ocrTextPreview: ocr.summary,
          lastAnalyzedAt: uploadedAt,
        }),
      ocrTextPreview: ocr.summary,
      lastAnalyzedAt: uploadedAt,
    };

    return metadata;
  }

  /**
   * Returns all stored document metadata, optionally filtered by application.
   */
  public listDocuments(applicationId?: string): DocumentMetadata[] {
    const documents = Array.from(this.documents.values());
    return applicationId
      ? documents.filter((doc) => doc.applicationId === applicationId)
      : documents;
  }

  /**
   * Retrieves a document by id, creating a placeholder when missing.
   */
  public getDocument(id: string): DocumentMetadata {
    const existing = this.documents.get(id);
    if (existing) {
      return existing;
    }

    const placeholder = this.buildMetadata({
      id,
      applicationId: "00000000-0000-0000-0000-000000000000",
      fileName: "placeholder.pdf",
      contentType: "application/pdf",
      status: "processing",
    });
    this.documents.set(id, placeholder);
    return placeholder;
  }

  /**
   * Saves metadata for an uploaded document.
   */
  public saveDocument(input: DocumentSaveInput): DocumentMetadata {
    const metadata = this.buildMetadata({
      ...input,
      status: input.status ?? "processing",
    });
    this.documents.set(metadata.id, metadata);
    return metadata;
  }

  /**
   * Updates the status of a document (e.g. reviewed, rejected).
   */
  public updateStatus(
    id: string,
    status: DocumentStatus,
  ): DocumentMetadata {
    const document = this.getDocument(id);
    const updated: DocumentMetadata = {
      ...document,
      status,
      lastAnalyzedAt: new Date().toISOString(),
    };
    this.documents.set(id, updated);
    return updated;
  }

  /**
   * Returns the status metadata for a document.
   */
  public getDocumentStatus(id: string): DocumentStatusResponse {
    const document = this.getDocument(id);
    return {
      id: document.id,
      status: document.status,
      lastUpdatedAt: document.lastAnalyzedAt ?? document.uploadedAt,
    };
  }

  /**
   * Generates an upload URL for the provided document identifier.
   */
  public generateUploadUrl(documentId: string, fileName: string) {
    return azureBlobStorage.createUploadUrl("documents", `${documentId}/${fileName}`);
  }
}

export const documentService = new DocumentService();

export type DocumentServiceType = DocumentService;

