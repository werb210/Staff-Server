import { randomUUID } from "crypto";
import type { Response } from "express";
import { basename } from "path";
import {
  type DocumentMetadata,
  type DocumentSaveInput,
  type DocumentStatus,
  type DocumentStatusResponse,
  type DocumentVersion,
} from "../schemas/document.schema.js";
import { createChecksum } from "../utils/checksum.js";
import { aiService, type AiServiceType } from "./aiService.js";
import {
  azureBlobService,
  type AzureBlobServiceType,
} from "./azureBlob.js";
import { ocrService, type OcrServiceType } from "./ocrService.js";

export interface DocumentServiceOptions {
  ai?: AiServiceType;
  ocr?: OcrServiceType;
  storage?: AzureBlobServiceType;
  seedDocuments?: Array<Partial<DocumentSaveInput> & { status: DocumentStatus }>;
}

interface DocumentHistoryPayload extends DocumentSaveInput {
  status: DocumentStatus;
  version: number;
  uploadedAt: string;
  uploadedBy?: string;
  note?: string;
  checksum?: string;
  blobName?: string;
  versionHistory?: DocumentVersion[];
}

/**
 * DocumentService tracks uploaded document metadata in memory with versioning support.
 */
export class DocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Document ${id} not found`);
    this.name = "DocumentNotFoundError";
  }
}

export class DocumentVersionNotFoundError extends Error {
  constructor(id: string, version: number) {
    super(`Version ${version} for document ${id} not found`);
    this.name = "DocumentVersionNotFoundError";
  }
}

export class DocumentService {
  private readonly documents = new Map<string, DocumentMetadata>();
  private readonly statusUpdates = new Map<string, string>();
  private readonly ai: AiServiceType;
  private readonly ocr: OcrServiceType;
  private readonly storage: AzureBlobServiceType;

  constructor(options: DocumentServiceOptions = {}) {
    this.ai = options.ai ?? aiService;
    this.ocr = options.ocr ?? ocrService;
    this.storage = options.storage ?? azureBlobService;

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

  private requireDocument(id: string): DocumentMetadata {
    const document = this.documents.get(id);
    if (!document) {
      throw new DocumentNotFoundError(id);
    }
    return document;
  }

  private sanitizeFileName(fileName: string): string {
    const baseName = basename(fileName);
    const trimmed = baseName.trim();
    if (trimmed.length === 0) {
      return "document";
    }
    return trimmed;
  }

  private resolveBlobName(
    id: string,
    version: number,
    fileName: string,
    provided?: string,
  ): string {
    if (provided && provided.length > 0) {
      return provided;
    }
    return `${id}/v${version}/${this.sanitizeFileName(fileName)}`;
  }

  private createVersion({
    id,
    fileName,
    contentType,
    version,
    checksum,
    blobName,
    uploadedBy,
    note,
    uploadedAt,
  }: DocumentHistoryPayload & { id: string }): DocumentVersion {
    const resolvedBlobName = this.resolveBlobName(id, version, fileName, blobName);
    const resolvedChecksum = checksum ?? createChecksum(`${fileName}:${version}`);

    return {
      version,
      uploadedAt,
      checksum: resolvedChecksum,
      blobName: resolvedBlobName,
      fileName,
      contentType,
      uploadedBy,
      note: note ?? undefined,
    };
  }

  private toVersion(document: DocumentMetadata): DocumentVersion {
    return {
      version: document.version,
      uploadedAt: document.uploadedAt,
      checksum: document.checksum,
      blobName: document.blobName,
      fileName: document.fileName,
      contentType: document.contentType,
      uploadedBy: document.uploadedBy,
      note: document.note,
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
      blobName: currentVersion.blobName,
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
          blobName: currentVersion.blobName,
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
      ? [this.toVersion(existing), ...existing.versionHistory]
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
    this.statusUpdates.set(id, metadata.uploadedAt);
    return metadata;
  }

  /**
   * Uploads binary content to Azure Blob Storage and records a document version.
   */
  public async uploadDocument(input: {
    applicationId: string;
    documentId?: string;
    fileName: string;
    contentType: string;
    data: Buffer;
    uploadedBy?: string;
    note?: string;
    status?: DocumentStatus;
  }): Promise<DocumentMetadata> {
    const id = input.documentId ?? randomUUID();
    const existing = this.documents.get(id);
    const version = (existing?.version ?? 0) + 1;
    const sanitizedFileName = this.sanitizeFileName(input.fileName);
    const blobName = this.resolveBlobName(id, version, sanitizedFileName);
    await this.storage.uploadFile(input.data, blobName, input.contentType);
    const checksum = createChecksum(input.data);

    return this.saveDocument({
      id,
      applicationId: input.applicationId,
      fileName: sanitizedFileName,
      contentType: input.contentType,
      uploadedBy: input.uploadedBy,
      note: input.note,
      status: input.status ?? existing?.status ?? "processing",
      checksum,
      blobName,
    });
  }

  /**
   * Updates the status of a document.
   */
  public updateStatus(
    id: string,
    status: DocumentStatus,
    reviewedBy?: string,
  ): DocumentMetadata {
    const document = this.requireDocument(id);
    const lastUpdatedAt = new Date().toISOString();
    const auditTrail = reviewedBy
      ? {
          ...(document.explainability ?? {}),
          reviewer: reviewedBy,
          reviewerUpdatedAt: lastUpdatedAt,
        }
      : document.explainability;

    const updated: DocumentMetadata = {
      ...document,
      status,
      explainability: auditTrail,
    };

    this.documents.set(id, updated);
    this.statusUpdates.set(id, lastUpdatedAt);
    return updated;
  }

  /**
   * Returns the current status payload for a document.
   */
  public getStatus(id: string): DocumentStatusResponse {
    const document = this.requireDocument(id);
    return {
      id: document.id,
      status: document.status,
      version: document.version,
      lastUpdatedAt: this.statusUpdates.get(id) ?? document.uploadedAt,
    };
  }

  /**
   * Returns the version history including the current version.
   */
  public listVersions(id: string): DocumentVersion[] {
    const document = this.requireDocument(id);
    return [this.toVersion(document), ...document.versionHistory];
  }

  /**
   * Resolves metadata for a specific document version.
   */
  public getVersionInfo(id: string, version?: number): DocumentVersion {
    const document = this.requireDocument(id);
    if (version === undefined || version === document.version) {
      return this.toVersion(document);
    }

    const history = document.versionHistory.find((entry) => entry.version === version);
    if (!history) {
      throw new DocumentVersionNotFoundError(id, version);
    }

    return history;
  }

  /**
   * Streams a document version directly to the response.
   */
  public async streamVersion(
    version: DocumentVersion,
    res: Response,
  ): Promise<void> {
    await this.storage.streamFile(version.blobName, res);
  }

  /**
   * Downloads the requested document version into memory.
   */
  public async downloadDocument(
    id: string,
    version?: number,
  ): Promise<{ buffer: Buffer; version: DocumentVersion }> {
    const versionInfo = this.getVersionInfo(id, version);
    const buffer = await this.storage.downloadFile(versionInfo.blobName);
    return { buffer, version: versionInfo };
  }

  /**
   * Downloads the binary content for a specific document version.
   */
  public async downloadVersionData(version: DocumentVersion): Promise<Buffer> {
    return this.storage.downloadFile(version.blobName);
  }
}

export const documentService = new DocumentService();

export type DocumentServiceType = DocumentService;

export const createDocumentService = (
  options: DocumentServiceOptions = {},
): DocumentService => new DocumentService(options);
