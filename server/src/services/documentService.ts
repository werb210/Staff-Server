// server/src/services/documentService.ts
import { db } from '../db/db.js';
import { documents } from '../db/schema/documents.js';
import { documentVersions } from '../db/schema/documentVersions.js';
import { eq } from 'drizzle-orm';
import * as blobService from './blobService.js';

//
// ======================================================
//  Create or Replace Document
// ======================================================
//
export async function uploadDocument({
  applicationId,
  documentId,
  fileName,
  mimeType,
  buffer
}: {
  applicationId: string;
  documentId: string | null; // null = new doc
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  // Upload to Azure
  const uploadInfo = await blobService.uploadFile(
    applicationId,
    documentId || 'new',
    fileName,
    buffer,
    mimeType
  );

  if (!documentId) {
    // Create new document
    const [created] = await db.insert(documents).values({
      applicationId,
      name: fileName,
      mimeType,
      azureBlobKey: uploadInfo.blobKey,
      checksum: uploadInfo.checksum,
      sizeBytes: uploadInfo.sizeBytes,
      status: 'pending',
    }).returning();

    return created;
  }

  // Existing → versioning
  const [existing] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!existing) throw new Error("Document not found.");

  // Save version
  const versionCount = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  await db.insert(documentVersions).values({
    documentId,
    versionNumber: versionCount.length + 1,
    azureBlobKey: existing.azureBlobKey,
    checksum: existing.checksum,
    sizeBytes: existing.sizeBytes,
  });

  // Update main record
  const [updated] = await db
    .update(documents)
    .set({
      name: fileName,
      mimeType,
      azureBlobKey: uploadInfo.blobKey,
      checksum: uploadInfo.checksum,
      sizeBytes: uploadInfo.sizeBytes,
      status: 'pending',
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
    .returning();

  return updated;
}

//
// ======================================================
//  Get Document + SAS URL for Preview/Download
// ======================================================
//
export async function getDocument(documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc) throw new Error('Document not found.');

  const exists = await blobService.exists(doc.azureBlobKey);
  if (!exists) {
    throw new Error('Missing file in Azure Blob Storage.');
  }

  const sasUrl = await blobService.getSasUrl(doc.azureBlobKey);

  return {
    ...doc,
    sasUrl,
  };
}

//
// ======================================================
//  List All Documents for Application
// ======================================================
//
export async function listByApplication(applicationId: string) {
  return await db
    .select()
    .from(documents)
    .where(eq(documents.applicationId, applicationId));
}

//
// ======================================================
//  Mark Document Status (Block 6 continues this flow)
// ======================================================
//
export async function setStatus(documentId: string, status: string, rejectionReason?: string) {
  const [updated] = await db
    .update(documents)
    .set({
      status,
      rejectionReason: rejectionReason || null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
    .returning();

  return updated;
}
