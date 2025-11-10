import { randomUUID } from "node:crypto";
import { calculateChecksum } from "./checksum.js";

/**
 * Represents the payload required to upload content to Azure Blob Storage.
 */
export interface UploadRequest {
  container: string;
  blobName?: string;
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Summary returned to consumers after uploading content to the stub storage.
 */
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
  id: string;
  container: string;
  blobName: string;
  content: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  uploadedAt: Date;
  etag: string;
}

/**
 * Minimal in-memory Azure Blob client used for local testing.
 * Stores blobs in memory and generates deterministic SAS URLs.
 */
export class AzureBlobClient {
  private readonly storage = new Map<string, StoredBlob>();
  private readonly baseUrl = "https://stub.blob.core.windows.net";

  /**
   * Uploads content to the stub blob storage.
   */
  async upload(request: UploadRequest): Promise<UploadResult> {
    if (!request.container) {
      throw new Error("Container name is required");
    }

    const blobName = request.blobName ?? randomUUID();
    const key = this.buildKey(request.container, blobName);
    const stored: StoredBlob = {
      id: randomUUID(),
      container: request.container,
      blobName,
      content: Buffer.from(request.data),
      contentType: request.contentType ?? "application/octet-stream",
      metadata: request.metadata ?? {},
      uploadedAt: new Date(),
      etag: calculateChecksum(request.data)
    };

    this.storage.set(key, stored);

    return {
      container: stored.container,
      blobName: stored.blobName,
      url: this.buildUrl(stored.container, stored.blobName),
      etag: stored.etag,
      uploadedAt: stored.uploadedAt.toISOString(),
      size: stored.content.length,
      metadata: { ...stored.metadata }
    };
  }

  /**
   * Lists blobs stored for the provided container.
   */
  listBlobs(container: string): UploadResult[] {
    return Array.from(this.storage.values())
      .filter((blob) => blob.container === container)
      .map((blob) => ({
        container: blob.container,
        blobName: blob.blobName,
        url: this.buildUrl(blob.container, blob.blobName),
        etag: blob.etag,
        uploadedAt: blob.uploadedAt.toISOString(),
        size: blob.content.length,
        metadata: { ...blob.metadata }
      }));
  }

  /**
   * Generates a signed URL for accessing a stored blob.
   */
  generateSasUrl(container: string, blobName: string, expiresInSeconds = 3600): string {
    const expiry = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const signature = calculateChecksum(`${container}/${blobName}/${expiry}`);
    return `${this.buildUrl(container, blobName)}?sig=${signature}&se=${encodeURIComponent(expiry)}`;
  }

  private buildKey(container: string, blobName: string): string {
    return `${container}::${blobName}`;
  }

  private buildUrl(container: string, blobName: string): string {
    return `${this.baseUrl}/${container}/${blobName}`;
  }
}

export const azureBlobClient = new AzureBlobClient();
