import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma';
import { env } from '../utils/env';
import { calculateChecksum, blobExists } from '../utils/documentIntegrity';
import { createLogger } from '../utils/logger';
import { performOcr } from './ocrService';

const logger = createLogger('document-service');
const containerClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING).getContainerClient(env.AZURE_BLOB_CONTAINER);

export interface UploadInput {
  ownerId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export async function uploadDocument(input: UploadInput) {
  await containerClient.createIfNotExists();
  const blobKey = `${input.ownerId}/${Date.now()}-${randomUUID()}-${input.fileName}`;
  const client = containerClient.getBlockBlobClient(blobKey);

  const checksum = calculateChecksum(input.buffer);
  await client.uploadData(input.buffer, {
    blobHTTPHeaders: { blobContentType: input.mimeType },
    metadata: input.metadata,
  });

  const versionNumber = 1;
  const document = await prisma.document.create({
    data: {
      id: randomUUID(),
      ownerId: input.ownerId,
      title: input.fileName,
      checksum,
      size: input.buffer.length,
      mimeType: input.mimeType,
      storagePath: blobKey,
      versions: {
        create: {
          id: randomUUID(),
          versionNumber,
          blobKey,
          checksum,
          size: input.buffer.length,
          mimeType: input.mimeType,
          fileName: input.fileName,
          metadata: input.metadata || {},
        },
      },
    },
    include: { versions: true },
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: input.ownerId,
      action: 'DOCUMENT_UPLOAD',
      targetType: 'DOCUMENT',
      targetId: document.id,
    },
  });

  return document;
}

export async function downloadDocument(documentId: string, versionId?: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const version = await selectVersion(documentId, versionId);
  const client = containerClient.getBlockBlobClient(version.blobKey);
  if (!(await client.exists())) {
    const err = new Error('File not found in storage');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const download = await client.download();
  const buffer = await streamToBuffer(download.readableStreamBody ?? null);
  return { buffer, mimeType: version.mimeType, fileName: version.fileName };
}

export async function previewDocument(documentId: string): Promise<{ preview: string; mimeType: string }> {
  const { buffer, mimeType } = await downloadDocument(documentId);
  const preview = buffer.toString('base64');
  return { preview, mimeType };
}

export async function getVersionHistory(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true, versionNumber: true, checksum: true, createdAt: true, mimeType: true, fileName: true },
  });
}

export async function verifyChecksum(documentId: string, versionId?: string): Promise<{ valid: boolean; checksum: string }> {
  const version = await selectVersion(documentId, versionId);
  const client = containerClient.getBlockBlobClient(version.blobKey);
  const download = await client.download();
  const buffer = await streamToBuffer(download.readableStreamBody ?? null);
  const checksum = calculateChecksum(buffer);
  return { valid: checksum === version.checksum, checksum };
}

export async function triggerOcr(documentId: string, versionId?: string) {
  const version = await selectVersion(documentId, versionId);
  const client = containerClient.getBlockBlobClient(version.blobKey);
  const download = await client.download();
  const buffer = await streamToBuffer(download.readableStreamBody ?? null);

  const ocrResult = await performOcr(documentId, version.id, buffer, version.mimeType);
  await prisma.documentVersion.update({ where: { id: version.id }, data: { ocrText: ocrResult.text, metadata: { ...(version.metadata as Record<string, unknown> | null), ocr: ocrResult.metadata } } });
  return ocrResult;
}

export async function recordNewVersion(documentId: string, input: Omit<UploadInput, 'ownerId'> & { uploaderId: string }) {
  await containerClient.createIfNotExists();
  const document = await prisma.document.findUnique({ where: { id: documentId }, include: { versions: true } });
  if (!document) {
    const err = new Error('Document not found');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }

  const blobKey = `${document.ownerId}/${Date.now()}-${randomUUID()}-${input.fileName}`;
  const client = containerClient.getBlockBlobClient(blobKey);
  const checksum = calculateChecksum(input.buffer);
  await client.uploadData(input.buffer, {
    blobHTTPHeaders: { blobContentType: input.mimeType },
    metadata: input.metadata,
  });

  const versionNumber = document.versions.length + 1;
  const version = await prisma.documentVersion.create({
    data: {
      id: randomUUID(),
      documentId,
      versionNumber,
      blobKey,
      checksum,
      size: input.buffer.length,
      mimeType: input.mimeType,
      fileName: input.fileName,
      metadata: input.metadata || {},
    },
  });

  await prisma.document.update({ where: { id: documentId }, data: { storagePath: blobKey, checksum, size: input.buffer.length, mimeType: input.mimeType } });
  await prisma.auditLog.create({ data: { id: randomUUID(), userId: input.uploaderId, action: 'DOCUMENT_VERSION', targetType: 'DOCUMENT', targetId: documentId } });
  return version;
}

export async function checkMissingFiles(documentId: string): Promise<{ missing: boolean; blobKey?: string }> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    const err = new Error('Document not found');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const missing = !(await blobExists(document.storagePath));
  return { missing, blobKey: missing ? document.storagePath : undefined };
}

async function selectVersion(documentId: string, versionId?: string) {
  if (versionId) {
    const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      const err = new Error('Document version not found');
      (err as Error & { status?: number }).status = 404;
      throw err;
    }
    return version;
  }
  const latest = await prisma.documentVersion.findFirst({ where: { documentId }, orderBy: { versionNumber: 'desc' } });
  if (!latest) {
    const err = new Error('Document version not found');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return latest;
}

async function streamToBuffer(stream: NodeJS.ReadableStream | null): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
