import crypto from "node:crypto";
import path from "node:path";
import { DocumentSchema } from "../schemas/documentSchema.js";
import type { DocumentSchemaType } from "../schemas/documentSchema.js";
import { logDebug, logError, logInfo } from "../utils/logger.js";
import { calculateChecksum } from "../utils/checksum.js";
import { deleteTemporaryFile, saveTemporaryFile } from "../utils/fileHandler.js";
import { uploadToS3 } from "../utils/s3Storage.js";

/**
 * Shape describing a stored document record returned by the document service.
 */
export interface DocumentRecord extends DocumentSchemaType {
  description: string;
  required: boolean;
  checksum: string;
  mimeType: string;
  url: string;
  storageKey: string;
  size: number;
  lastUpdatedAt: string;
}

/**
 * Payload accepted by {@link processDocumentUpload} when persisting a document.
 */
export interface DocumentUploadPayload {
  applicationId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}

/**
 * Error thrown when attempting to retrieve a document that does not exist in the store.
 */
export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document with id ${documentId} was not found`);
    this.name = "DocumentNotFoundError";
  }
}

interface InternalDocumentRecord extends DocumentRecord {
  processingStartedAt: number;
}

const documentStore = new Map<string, InternalDocumentRecord>();
const documentIndexByApplication = new Map<string, Set<string>>();

function registerDocument(record: InternalDocumentRecord): void {
  documentStore.set(record.id, record);
  const existing = documentIndexByApplication.get(record.applicationId);
  if (existing) {
    existing.add(record.id);
    return;
  }
  documentIndexByApplication.set(record.applicationId, new Set([record.id]));
}

function mapMimeTypeToDocumentType(mimeType: string): DocumentSchemaType["type"] {
  if (mimeType.startsWith("application/pdf")) {
    return "pdf";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  return "other";
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_\.]/g, "_");
}

function toExternalRecord(record: InternalDocumentRecord): DocumentRecord {
  const { processingStartedAt, ...rest } = record;
  return rest;
}

function updateLifecycle(record: InternalDocumentRecord): void {
  if (record.status !== "processing") {
    return;
  }
  const elapsedMs = Date.now() - record.processingStartedAt;
  if (elapsedMs >= 2000) {
    record.status = "received";
    record.lastUpdatedAt = new Date().toISOString();
  }
}

/**
 * Persists a document upload for an application by saving a temporary file and simulating an S3 upload.
 */
export async function processDocumentUpload(payload: DocumentUploadPayload): Promise<DocumentRecord> {
  logInfo("processDocumentUpload invoked");
  logDebug("processDocumentUpload payload", {
    applicationId: payload.applicationId,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    size: payload.content.byteLength
  });

  const sanitizedName = sanitizeFileName(payload.fileName);
  const temporaryPath = await saveTemporaryFile(payload.content, sanitizedName);
  const checksum = calculateChecksum(payload.content);

  const storageKey = path.posix.join(
    "applications",
    payload.applicationId,
    `${Date.now()}-${sanitizedName}`
  );

  try {
    const uploadResult = await uploadToS3(
      payload.content,
      {
        bucket: process.env.DOCUMENTS_BUCKET ?? "loan-origination-documents",
        key: storageKey,
        region: process.env.AWS_REGION ?? "us-east-1"
      },
      payload.mimeType
    );

    const now = new Date().toISOString();
    const baseDocument = DocumentSchema.parse({
      id: crypto.randomUUID(),
      applicationId: payload.applicationId,
      name: payload.fileName,
      type: mapMimeTypeToDocumentType(payload.mimeType),
      status: "processing",
      uploadedAt: now
    });

    const storedRecord: InternalDocumentRecord = {
      ...baseDocument,
      description: `Uploaded ${payload.fileName} (${payload.mimeType})`,
      required: true,
      checksum,
      mimeType: payload.mimeType,
      url: uploadResult.url,
      storageKey: uploadResult.key,
      size: payload.content.byteLength,
      lastUpdatedAt: now,
      processingStartedAt: Date.now()
    };

    registerDocument(storedRecord);
    return toExternalRecord(storedRecord);
  } catch (error) {
    logError("Failed to process document upload", error);
    throw error;
  } finally {
    await deleteTemporaryFile(temporaryPath);
  }
}

/**
 * Retrieves the current processing status and metadata for a document.
 */
export async function fetchDocumentStatus(documentId: string): Promise<DocumentRecord> {
  logInfo("fetchDocumentStatus invoked");
  logDebug("fetchDocumentStatus payload", { documentId });
  const record = documentStore.get(documentId);
  if (!record) {
    throw new DocumentNotFoundError(documentId);
  }
  updateLifecycle(record);
  return toExternalRecord(record);
}

/**
 * Returns the list of documents that have been associated with an application.
 */
export async function listApplicationDocuments(applicationId: string): Promise<DocumentRecord[]> {
  logInfo("listApplicationDocuments invoked");
  logDebug("listApplicationDocuments payload", { applicationId });
  const documentIds = documentIndexByApplication.get(applicationId);
  if (!documentIds) {
    return [];
  }
  const records: DocumentRecord[] = [];
  for (const id of documentIds.values()) {
    const record = documentStore.get(id);
    if (!record) {
      continue;
    }
    updateLifecycle(record);
    records.push(toExternalRecord(record));
  }
  return records;
}

const seedDocument: InternalDocumentRecord = {
  ...DocumentSchema.parse({
    id: "DOC-1001",
    applicationId: "APP-1001",
    name: "Business Plan",
    type: "pdf",
    status: "received",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }),
  description: "Initial business plan provided by the applicant",
  required: true,
  checksum: calculateChecksum("seed-business-plan"),
  mimeType: "application/pdf",
  url: "https://example-bucket.s3.amazonaws.com/applications/APP-1001/business-plan.pdf",
  storageKey: "applications/APP-1001/business-plan.pdf",
  size: 124578,
  lastUpdatedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  processingStartedAt: Date.now() - 1000 * 60 * 60
};

registerDocument(seedDocument);
