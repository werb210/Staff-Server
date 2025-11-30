import { db } from '../db/db.js';
import { documents } from '../db/schema/documents.js';
import { documentVersions } from '../db/schema/documentVersions.js';
import { applications } from '../db/schema/applications.js';
import { pipelineEvents } from '../db/schema/pipeline.js';
import { eq } from 'drizzle-orm';
import * as blobService from './blobService.js';

declare const broadcast: (payload: any) => void;

//
// ======================================================
//  Upload or Replace Document
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
  documentId: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const uploadInfo = await blobService.uploadFile(
    applicationId,
    documentId || 'new',
    fileName,
    buffer,
    mimeType
  );

  if (!documentId) {
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

  const [existing] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!existing) throw new Error("Document not found.");

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
//  Get Document + SAS URL
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
//  List Documents for Application
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
//  ACCEPT DOCUMENT
// ======================================================
//
export async function acceptDocument(documentId: string) {
  const [updated] = await db
    .update(documents)
    .set({
      status: 'accepted',
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
    .returning();

  if (!updated) throw new Error('Document not found.');

  // After accepting, check if all docs are accepted.
  await checkIfAllDocsAccepted(updated.applicationId);

  return updated;
}

//
// ======================================================
//  REJECT DOCUMENT
// ======================================================
//
export async function rejectDocument(documentId: string, reason: string) {
  const [updated] = await db
    .update(documents)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
    .returning();

  if (!updated) throw new Error('Document not found.');

  // Rejected docs always move pipeline to "Documents Required"
  await db.insert(pipelineEvents).values({
    applicationId: updated.applicationId,
    stage: 'Documents Required',
    reason: `Document rejected: ${reason}`,
  });

  // Update application stage
  await db.update(applications)
    .set({
      pipelineStage: 'Documents Required',
      updatedAt: new Date(),
    })
    .where(eq(applications.id, updated.applicationId));

  // Real-time broadcast
  broadcast({
    type: 'pipeline-update',
    applicationId: updated.applicationId,
    stage: 'Documents Required',
  });

  // Notify client via chat-like system
  broadcast({
    type: 'doc-rejected',
    applicationId: updated.applicationId,
    documentId,
    reason,
  });

  return updated;
}

//
// ======================================================
//  CHECK IF ALL DOCUMENTS ACCEPTED
//  → If yes, unlock signing for client
// ======================================================
//
export async function checkIfAllDocsAccepted(applicationId: string) {
  const list = await listByApplication(applicationId);

  if (list.length === 0) return false;

  const allAccepted = list.every((d) => d.status === 'accepted');

  if (!allAccepted) return false;

  // Update pipeline → "Ready for Signing"
  await db.insert(pipelineEvents).values({
    applicationId,
    stage: 'Ready for Signing',
    reason: 'All documents accepted',
  });

  await db.update(applications)
    .set({
      pipelineStage: 'Ready for Signing',
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Notify client portal
  broadcast({
    type: 'pipeline-update',
    applicationId,
    stage: 'Ready for Signing',
  });

  return true;
}
