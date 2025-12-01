import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuid } from "uuid";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER!;

const blobService = BlobServiceClient.fromConnectionString(connectionString);
const container = blobService.getContainerClient(containerName);

export async function uploadBuffer(buffer: Buffer, mimeType: string): Promise<{ key: string; url: string }> {
  const key = uuid();
  const blob = container.getBlockBlobClient(key);

  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType }
  });

  return { key, url: blob.url };
}

export function getBlobUrl(key: string): string {
  return container.getBlockBlobClient(key).url;
}

export async function deleteBlob(key: string) {
  await container.deleteBlob(key);
}
