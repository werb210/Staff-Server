import { BlobServiceClient } from '@azure/storage-blob';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { env } from './env';
import { createLogger } from './logger';

const blobClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING).getContainerClient(env.AZURE_BLOB_CONTAINER);
const logger = createLogger('document-integrity');

export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function blobExists(blobName: string): Promise<boolean> {
  const client = blobClient.getBlobClient(blobName);
  return client.exists();
}

export async function validateDocumentRecord(documentId: string): Promise<{ ok: boolean; message?: string }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!document || document.versions.length === 0) {
    return { ok: false, message: 'Document or version missing in database' };
  }

  const latest = document.versions[0];
  const client = blobClient.getBlockBlobClient(latest.blobKey);
  const exists = await client.exists();
  if (!exists) {
    return { ok: false, message: 'Blob missing from Azure storage' };
  }

  const download = await client.download();
  const buffer = await streamToBuffer(download.readableStreamBody ?? null);
  const checksum = calculateChecksum(buffer);
  if (checksum !== latest.checksum) {
    logger.warn('Checksum mismatch detected', { documentId, blobKey: latest.blobKey });
    return { ok: false, message: 'Checksum mismatch between database and blob' };
  }

  return { ok: true };
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
