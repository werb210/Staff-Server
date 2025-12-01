import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { ENV } from "../config/env.js";

const credential = new StorageSharedKeyCredential(
  ENV.AZURE_STORAGE_ACCOUNT,
  ENV.AZURE_STORAGE_KEY
);

export const blobService = new BlobServiceClient(
  `https://${ENV.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);

export function getContainer() {
  return blobService.getContainerClient(ENV.AZURE_STORAGE_CONTAINER);
}

export function getBlobUrl(key: string) {
  return getContainer().getBlockBlobClient(key).url;
}
