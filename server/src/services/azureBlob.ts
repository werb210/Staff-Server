import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import type { Response } from "express";
import { pipeline } from "stream/promises";

export interface AzureBlobServiceType {
  uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ blobName: string; url: string }>;
  downloadFile(blobName: string): Promise<Buffer>;
  streamFile(blobName: string, res: Response): Promise<void>;
  exists(blobName: string): Promise<boolean>;
  deleteFile(blobName: string): Promise<void>;
}

const resolveConnectionString = (): string => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  }
  return connectionString;
};

const resolveContainerName = (): string =>
  process.env.AZURE_STORAGE_CONTAINER ?? "documents";

class AzureBlobService implements AzureBlobServiceType {
  private containerClientPromise: Promise<ContainerClient> | null = null;

  private async getContainerClient(): Promise<ContainerClient> {
    if (!this.containerClientPromise) {
      const connectionString = resolveConnectionString();
      const containerName = resolveContainerName();
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      this.containerClientPromise = (async () => {
        await containerClient.createIfNotExists();
        return containerClient;
      })();
    }

    return this.containerClientPromise;
  }

  public async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ blobName: string; url: string }> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(fileName);
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    return { blobName: fileName, url: blobClient.url };
  }

  public async downloadFile(blobName: string): Promise<Buffer> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const download = await blobClient.download();
    const chunks: Buffer[] = [];
    const stream = download.readableStreamBody;
    if (!stream) {
      return Buffer.alloc(0);
    }
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  public async streamFile(blobName: string, res: Response): Promise<void> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const download = await blobClient.download();
    const stream = download.readableStreamBody;
    if (!stream) {
      throw new Error(`Unable to stream blob ${blobName}`);
    }
    await pipeline(stream, res);
  }

  public async exists(blobName: string): Promise<boolean> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    return blobClient.exists();
  }

  public async deleteFile(blobName: string): Promise<void> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.deleteIfExists();
  }
}

export const azureBlobService = new AzureBlobService();

export const createAzureBlobService = (): AzureBlobService =>
  new AzureBlobService();

export type { AzureBlobService as AzureBlobServiceImpl };
