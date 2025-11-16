// server/src/services/documentService.ts

import { registry } from "../db/registry.js";
import {
  uploadBuffer,
  getPresignedUrl,
  getBuffer,
  getStream,
} from "../services/azureBlob.js";

export interface CreateDocumentInput {
  applicationId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a document record + upload buffer to Azure
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<DocumentRecord> {
  const blobKey = `apps/${input.applicationId}/${Date.now()}-${input.originalName}`;

  // Upload to Azure Blob
  await uploadBuffer(blobKey, input.buffer, input.mimeType);

  // Insert DB row
  const doc = await registry.documents.insert({
    applicationId: input.applicationId,
    name: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    blobKey,
  });

  return doc;
}

/**
 * List all documents for an application
 */
export async function listDocuments(
  applicationId: string
): Promise<DocumentRecord[]> {
  return registry.documents.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Generate a temporary download URL
 */
export async function getDocumentDownloadUrl(
  documentId: string
): Promise<string | null> {
  const doc = await registry.documents.findUnique({
    where: { id: documentId },
  });
  if (!doc) return null;

  return getPresignedUrl(doc.blobKey);
}

/**
 * Retrieve raw bytes (used for ZIP bundles)
 */
export async function getDocumentBuffer(
  documentId: string
): Promise<Buffer | null> {
  const doc = await registry.documents.findUnique({
    where: { id: documentId },
  });
  if (!doc) return null;

  return getBuffer(doc.blobKey);
}

/**
 * Delete document (DB only — blob stays until we confirm safe delete policy)
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  const doc = await registry.documents.findUnique({
    where: { id: documentId },
  });

  if (!doc) return false;

  // Delete DB record
  await registry.documents.delete({ where: { id: documentId } });

  // Azure Blob deletion intentionally disabled per your global policy
  return true;
}

export default {
  createDocument,
  listDocuments,
  getDocumentDownloadUrl,
  getDocumentBuffer,
  deleteDocument,
};
