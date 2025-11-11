import { randomUUID } from "crypto";
import {
  type DocumentMetadata,
  type DocumentSaveInput,
  type DocumentStatus,
  type DocumentStatusResponse,
  type DocumentVersion,
} from "../schemas/document.schema.js";
import { azureBlobStorage, type AzureBlobStorageType } from "../utils/azureBlobStorage.js";
import { createChecksum } from "../utils/checksum.js";
import { aiService, type AiServiceType } from "./aiService.js";
import { ocrService, type OcrServiceType } from "./ocrService.js";

export interface DocumentServiceOptions {
  ai?: AiServiceType;
  ocr?: OcrServiceType;
  storage?: AzureBlobStorageType;
  seedDocuments?: Array<Partial<DocumentSaveInput> & { status: DocumentStatus }>;
}

interface DocumentHistoryPayload extends DocumentSaveInput {
  status: DocumentStatus;
  version: number;
  uploadedAt: string;
  uploadedBy?: string;
  note?: string;
  versionHistory?: DocumentVersion[];
}

/**
 * DocumentService tracks uploaded document metadata in memory with versioning support.
 */
export class DocumentService {
  private readonly documents = new Map<string, DocumentMetadata>();
  private readonly ai: AiServiceType;
  private readonly ocr: OcrServiceType;
  private readonly storage: AzureBlobStorageType;

  constructor(options: DocumentServiceOptions = {}) {
    this.ai = options.ai ?? aiService;
    this.ocr = options.ocr ?? ocrService;
    this.storage = options.storage ?? azureBlobStorage;

    const seedDocuments = options.seedDocuments ?? [
      {
        id: "9d7c1c70-0d21-4f32-8fd3-bf366d9d14d4",
        applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
        fileName: "bank-statement.pdf",
        contentType: "application/pdf",
        status: "review" as const,
        uploadedBy: "alex.martin",
      },
      {
        id: "0c26a565-19cb-47c5-9fde-68a0f6140f8d",
        applicationId: "8c0ca80e-efb6-4b8f-92dd-18de78274b3d",
        fileName: "tax-return-2023.pdf",
        contentType: "application/pdf",
        status: "approved" as const,
        uploadedBy: "olivia.lee",
      },
    ];

    seedDocuments.forEach((seed) => {
      const created = this.saveDocument({
        id: seed.id,
        applicationId: seed.applicationId!,
        fileName: seed.fileName!,
        contentType: seed.contentType!,
        status: seed.status,
        uploadedBy: seed.uploadedBy,
      });
      if (seed.status) {
        this.updateStatus(created.id, seed.status);
      }
    });
  }

  private createVersion({
    id,
    fileName,
    version,
    checksum,
    blobUrl,
    uploadedBy,
    note,
    uploadedAt,
  }: DocumentHistoryPayload & { id: string }): DocumentVersion {
    const blobPath = `${id}/v${version}/${fileName}`;
    const resolvedChecksum = checksum ?? createChecksum(`${fileName}:${version}`);
    const resolvedBlobUrl =
      blobUrl ?? `https://example.blob.core.windows.net/documents/${blobPath}`;

    return {
      version,
      uploadedAt,
      checksum: resolvedChecksum,
      blobUrl: resolvedBlobUrl,
      sasUrl: this.storage.generateSasUrl("documents", blobPath),
      uploadedBy,
      note: note ?? undefined,
    };
  }

  private buildMetadata(input: DocumentHistoryPayload): DocumentMetadata {
    const id = input.id ?? randomUUID();
    const ocr = this.ocr.analyze(input.fileName);
    const summary =
      input.aiSummary ??
      this.ai.summarizeDocument({
        fileName: input.fileName,
        ocrTextPreview: ocr.summary,
      });

    const currentVersion = this.createVersion({ ...input, id });

    return {
      id,
      applicationId: input.applicationId,
      fileName: input.fileName,
      contentType: input.contentType,
      status: input.status,
      version: input.version,
      uploadedAt: input.uploadedAt,
      uploadedBy: input.uploadedBy,
      checksum: currentVersion.checksum,
      blobUrl: currentVersion.blobUrl,
      sasUrl: currentVersion.sasUrl,
      note: input.note,
      aiSummary: summary,
      explainability:
        input.explainability ??
        this.ai.buildDocumentExplainability({
          id,
          applicationId: input.applicationId,
          fileName: input.fileName,
          contentType: input.contentType,
          status: input.status,
          version: input.version,
          uploadedAt: input.uploadedAt,
          checksum: currentVersion.checksum,
          blobUrl: currentVersion.blobUrl,
          sasUrl: currentVersion.sasUrl,
          aiSummary: summary,
          ocrTextPreview: ocr.summary,
          lastAnalyzedAt: input.uploadedAt,
          versionHistory: input.versionHistory ?? [],
        }),
      ocrTextPreview: ocr.summary,
      lastAnalyzedAt: input.uploadedAt,
      versionHistory: input.versionHistory ?? [],
    };
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

    const uploadedAt = new Date().toISOString();
    const placeholder = this.buildMetadata({
      id,
      applicationId: "00000000-0000-0000-0000-000000000000",
      fileName: "placeholder.pdf",
      contentType: "application/pdf",
      status: "processing",
      version: 1,
      uploadedAt,
      versionHistory: [],
    });
    this.documents.set(id, placeholder);
    return placeholder;
  }

  /**
   * Saves metadata for an uploaded document and records a version.
   */
  public saveDocument(input: DocumentSaveInput): DocumentMetadata {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    const existing = this.documents.get(id);
    const version = (existing?.version ?? 0) + 1;
    const status = input.status ?? existing?.status ?? "processing";

    const versionHistory = existing
      ? [
          {
            version: existing.version,
            uploadedAt: existing.uploadedAt,
            checksum: existing.checksum,
            blobUrl: existing.blobUrl,
            sasUrl: existing.sasUrl,
            uploadedBy: existing.uploadedBy,
            note: existing.note,
          },
          ...existing.versionHistory,
        ]
      : [];

    const metadata = this.buildMetadata({
      ...input,
      id,
      status,
      version,
      uploadedAt: now,
      uploadedBy: input.uploadedBy ?? existing?.uploadedBy,
      note: input.note ?? existing?.note,
      versionHistory,
    });

    this.documents.set(id, metadata);
    return metadata;
  }

  /**
   * Updates the status of a document.
   */
  public updateStatus(id: string, status: DocumentStatus): DocumentStatusResponse {
    const document = this.getDocument(id);
    const updated: DocumentMetadata = { ...document, status };
    this.documents.set(id, updated);
    return {
      id,
      status,
      version: updated.version,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

export const documentService = new DocumentService();

export type DocumentServiceType = DocumentService;

export const createDocumentService = (
  options: DocumentServiceOptions = {},
): DocumentService => new DocumentService(options);
