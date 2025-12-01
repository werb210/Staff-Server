import applicationsRepo from '../db/repositories/applications.repo.js';
import documentVersionsRepo from '../db/repositories/documentVersions.repo.js';
import documentsRepo from '../db/repositories/documents.repo.js';
import pipelineEventsRepo from '../db/repositories/pipelineEvents.repo.js';
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
    const created = await documentsRepo.create({
      applicationId,
      name: fileName,
      mimeType,
      azureBlobKey: uploadInfo.blobKey,
      checksum: uploadInfo.checksum,
      sizeBytes: uploadInfo.sizeBytes,
      status: 'pending',
    });

    return created;
  }

  const existing = await documentsRepo.findById(documentId);

  if (!existing) throw new Error("Document not found.");

  const versionCount = await documentVersionsRepo.findMany({ documentId });

  await documentVersionsRepo.create({
    documentId,
    versionNumber: versionCount.length + 1,
    azureBlobKey: existing.azureBlobKey,
    checksum: existing.checksum,
    sizeBytes: existing.sizeBytes,
  });

  const updated = await documentsRepo.update(documentId, {
    name: fileName,
    mimeType,
    azureBlobKey: uploadInfo.blobKey,
    checksum: uploadInfo.checksum,
    sizeBytes: uploadInfo.sizeBytes,
    status: 'pending',
    rejectionReason: null,
    updatedAt: new Date(),
  });

  return updated;
}

//
// ======================================================
//  Get Document + SAS URL
// ======================================================
//
export async function getDocument(documentId: string) {
  const doc = await documentsRepo.findById(documentId);

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
  return documentsRepo.findMany({ applicationId });
}

//
// ======================================================
//  ACCEPT DOCUMENT
// ======================================================
//
export async function acceptDocument(documentId: string) {
  const updated = await documentsRepo.update(documentId, {
    status: 'accepted',
    rejectionReason: null,
    updatedAt: new Date(),
  });

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
  const updated = await documentsRepo.update(documentId, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date(),
  });

  if (!updated) throw new Error('Document not found.');

  // Rejected docs always move pipeline to "Documents Required"
  await pipelineEventsRepo.create({
    applicationId: updated.applicationId,
    stage: 'Documents Required',
    reason: `Document rejected: ${reason}`,
  });

  // Update application stage
  await applicationsRepo.update(updated.applicationId, {
    pipelineStage: 'Documents Required',
    updatedAt: new Date(),
  });

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
  await pipelineEventsRepo.create({
    applicationId,
    stage: 'Ready for Signing',
    reason: 'All documents accepted',
  });

  await applicationsRepo.update(applicationId, {
    pipelineStage: 'Ready for Signing',
    updatedAt: new Date(),
  });

  // Notify client portal
  broadcast({
    type: 'pipeline-update',
    applicationId,
    stage: 'Ready for Signing',
  });

  return true;
}
