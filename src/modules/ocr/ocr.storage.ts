import { BlobClient, BlobServiceClient } from "@azure/storage-blob";

export type OcrStorageInput = {
  content: string;
};

export type OcrStorage = {
  getBuffer: (input: OcrStorageInput) => Promise<Buffer>;
};

function parseDataUrl(content: string): Buffer | null {
  if (!content.startsWith("data:")) {
    return null;
  }
  const splitIndex = content.indexOf(",");
  if (splitIndex === -1) {
    return null;
  }
  const base64 = content.slice(splitIndex + 1);
  return Buffer.from(base64, "base64");
}

async function downloadAzureBlobFromUrl(url: string): Promise<Buffer> {
  const client = new BlobClient(url);
  return client.downloadToBuffer();
}

async function downloadAzureBlobFromPath(pathValue: string): Promise<Buffer> {
  const match = /^azure:\/\/([^/]+)\/(.+)$/.exec(pathValue);
  if (!match) {
    throw new Error("invalid_azure_blob_path");
  }
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("missing_azure_storage_connection_string");
  }
  const container = match[1];
  const blobName = match[2];
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobClient = serviceClient.getContainerClient(container).getBlobClient(blobName);
  return blobClient.downloadToBuffer();
}

export function createOcrStorage(): OcrStorage {
  return {
    async getBuffer(input: OcrStorageInput): Promise<Buffer> {
      const dataUrlBuffer = parseDataUrl(input.content);
      if (dataUrlBuffer) {
        return dataUrlBuffer;
      }
      if (input.content.startsWith("https://")) {
        return downloadAzureBlobFromUrl(input.content);
      }
      if (input.content.startsWith("azure://")) {
        return downloadAzureBlobFromPath(input.content);
      }
      return Buffer.from(input.content, "base64");
    },
  };
}
