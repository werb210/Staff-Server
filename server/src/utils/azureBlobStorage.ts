import { randomUUID } from "node:crypto";

import { calculateChecksum } from "./checksum.js";

export interface UploadRequest {
  container: string;
  blobName?: string;
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  container: string;
  blobName: string;
  url: string;
  etag: string;
  uploadedAt: string;
  size: number;
  metadata: Record<string, string>;
}

interface StoredBlob {
  container: string;
  blobName: string;
  content: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  uploadedAt: Date;
  etag: string;
}

const storage = new Map<string, StoredBlob>();
const baseUrl = "https://stub.blob.core.windows.net";

function buildKey(container: string, blobName: string): string {
  return `${container}::${blobName}`;
}

function buildUrl(container: string, blobName: string): string {
  return `${baseUrl}/${container}/${blobName}`;
}

export async function uploadToBlob(request: UploadRequest): Promise<UploadResult> {
  if (!request.container) {
    throw new Error("Container name is required");
  }

  const blobName = request.blobName ?? randomUUID();
  const key = buildKey(request.container, blobName);
  const stored: StoredBlob = {
    container: request.container,
    blobName,
    content: Buffer.from(request.data),
    contentType: request.contentType ?? "application/octet-stream",
    metadata: { ...(request.metadata ?? {}) },
    uploadedAt: new Date(),
    etag: calculateChecksum(request.data)
  };

  storage.set(key, stored);

  return {
    container: stored.container,
    blobName: stored.blobName,
    url: buildUrl(stored.container, stored.blobName),
    etag: stored.etag,
    uploadedAt: stored.uploadedAt.toISOString(),
    size: stored.content.length,
    metadata: { ...stored.metadata }
  };
}

export function listBlobs(container: string): UploadResult[] {
  return Array.from(storage.values())
    .filter((blob) => blob.container === container)
    .map((blob) => ({
      container: blob.container,
      blobName: blob.blobName,
      url: buildUrl(blob.container, blob.blobName),
      etag: blob.etag,
      uploadedAt: blob.uploadedAt.toISOString(),
      size: blob.content.length,
      metadata: { ...blob.metadata }
    }));
}

export function generateSASUrl(container: string, blobName: string, expiresInSeconds = 3600): string {
  const expiry = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const signature = calculateChecksum(`${container}/${blobName}/${expiry}`);
  return `${buildUrl(container, blobName)}?sig=${signature}&se=${encodeURIComponent(expiry)}`;
}
