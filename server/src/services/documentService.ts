import { randomUUID } from "crypto";
import {
  type DocumentMetadata,
  type DocumentSaveInput,
  type DocumentStatus,
  type DocumentStatusResponse,
  type DocumentVersion,
} from "../schemas/document.schema.js";
import { azureBlobStorage } from "../utils/azureBlobStorage.js";
import { createChecksum } from "../utils/checksum.js";
import { aiService } from "./aiService.js";
import { ocrService } from "./ocrService.js";

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
class DocumentService {
  private readonly documents = new Map<string, DocumentMetadata>();

  constructor() {
    const seedDocuments: Array<Partial<DocumentSaveInput> & { status: DocumentStatus }> = [
      {
        id: "9d7c1c70-0d21-4f32-8fd3-bf366d9d14d4",
        applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
        fileName: "bank-statement.pdf",
        contentType: "application/pdf",
        status: "review",
        uploadedBy: "alex.martin",
      },
      {
        id: "0c26a565-19cb-47c5-9fde-68a0f6140f8d",
        applicationId: "8c0ca80e-efb6-4b8f-92dd-18de78274b3d",
        fileName: "tax-return-2023.pdf",
        contentType: "application/pdf",
        status: "approved",
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
      sasUrl: azureBlobStorage.generateSasUrl("documents", blobPath),
      uploadedBy,
      note: note ?? undefined,
    };
  }

  private buildMetadata(input: DocumentHistoryPayload): DocumentMetadata {
    const id = input.id ?? randomUUID();
    const ocr = ocrService.analyze(input.fileName);
    const summary =
      input.aiSummary ??
      aiService.summarizeDocument({
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
        aiService.buildDocumentExplainability({
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
      versionHistory,
    });

    this.documents.set(id, metadata);
    return metadata;
  }

  /**
   * Updates the status of a document (e.g. reviewed, rejected).
   */
  public updateStatus(id: string, status: DocumentStatus): DocumentMetadata {
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
      version: document.version,
      lastUpdatedAt: document.lastAnalyzedAt ?? document.uploadedAt,
    };
  }

  /**
   * Lists the versions available for a document including the latest.
   */
  public listVersions(id: string): DocumentVersion[] {
    const document = this.getDocument(id);
    return [
      {
        version: document.version,
        uploadedAt: document.uploadedAt,
        checksum: document.checksum,
        blobUrl: document.blobUrl,
        sasUrl: document.sasUrl,
        uploadedBy: document.uploadedBy,
        note: document.note,
      },
      ...document.versionHistory,
    ];
  }

  /**
   * Generates an upload URL for the provided document identifier.
   */
  public generateUploadUrl(documentId: string, fileName: string) {
    const document = this.documents.get(documentId);
    const nextVersion = document ? document.version + 1 : 1;
    return azureBlobStorage.createUploadUrl(
      "documents",
      `${documentId}/v${nextVersion}/${fileName}`,
    );
  }

  /**
   * Returns a SAS URL to download the requested version of a document.
   */
  public getDownloadUrl(documentId: string, version?: number) {
    const document = this.getDocument(documentId);
    if (!version || version === document.version) {
      return {
        version: document.version,
        sasUrl: azureBlobStorage.generateSasUrl(
          "documents",
          `${documentId}/v${document.version}/${document.fileName}`,
        ),
      };
    }

    const targetVersion = document.versionHistory.find(
      (entry) => entry.version === version,
    );
    if (!targetVersion) {
      throw new Error("Version not found");
    }

    return {
      version: targetVersion.version,
      sasUrl: azureBlobStorage.generateSasUrl(
        "documents",
        `${documentId}/v${targetVersion.version}/${document.fileName}`,
      ),
    };
  }
}

export const documentService = new DocumentService();

export type DocumentServiceType = DocumentService;
