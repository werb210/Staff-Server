import { randomUUID } from "crypto";
import { logInfo } from "./logger.js";

export type AzureUploadOptions = {
  container: string;
  blobName?: string;
  contentType?: string;
};

export const uploadToAzureBlob = async (
  content: Buffer | string,
  options: AzureUploadOptions
): Promise<{ url: string; blobName: string }> => {
  const blobName = options.blobName ?? `${randomUUID()}`;
  logInfo("Azure Blob upload invoked", { container: options.container, blobName });
  return {
    url: `https://example.blob.core.windows.net/${options.container}/${blobName}`,
    blobName,
  };
};

export const getAzureBlob = async (container: string, blobName: string): Promise<string> => {
  logInfo("Azure Blob retrieval invoked", { container, blobName });
  return `https://example.blob.core.windows.net/${container}/${blobName}`;
};
