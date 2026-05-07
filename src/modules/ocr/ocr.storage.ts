import { BlobClient, BlobServiceClient } from "@azure/storage-blob";
import { logWarn } from "../../observability/logger.js";
import { config } from "../../config/index.js";

export type OcrStorageInput = {
  content: string;
};

export type OcrStorage = {
  fetchBuffer: (input: OcrStorageInput) => Promise<Buffer>;
};

const AZURE_BLOB_HOST_SUFFIXES = [
  ".blob.core.windows.net",
  ".blob.core.usgovcloudapi.net",
  ".blob.core.chinacloudapi.cn",
  ".blob.core.cloudapi.de",
];

export class OcrStorageValidationError extends Error {
  readonly url: string;

  constructor(url: string) {
    super("invalid_ocr_storage_url");
    this.name = "OcrStorageValidationError";
    this.url = url;
  }
}

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

function isAllowedAzureBlobUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  return AZURE_BLOB_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

async function downloadAzureBlobFromUrl(url: string): Promise<Buffer> {
  // BF_SERVER_BLOCK_v192_OCR_BLOB_AUTH_v1
  // Anonymous BlobClient(url) returns 401 for private containers (which is what
  // we use). When AZURE_STORAGE_CONNECTION_STRING is set AND its account matches
  // the URL's hostname, build a credentialed client. Fall back to anonymous for
  // public blobs, SAS-bearing URLs, or accounts we don't own — preserves prior
  // behaviour for those cases.
  const connectionString = config.azureStorage.connectionString;
  if (connectionString) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    if (parsed) {
      try {
        const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
        const cfgHost = new URL(serviceClient.url).hostname.toLowerCase();
        const urlHost = parsed.hostname.toLowerCase();
        if (urlHost === cfgHost) {
          const segments = parsed.pathname.replace(/^\/+/, "").split("/");
          const container = segments.shift();
          const blobName = decodeURIComponent(segments.join("/"));
          if (container && blobName) {
            const credentialed = serviceClient
              .getContainerClient(container)
              .getBlobClient(blobName);
            return credentialed.downloadToBuffer();
          }
        } else {
          logWarn("azure_storage_account_mismatch", {
            code: "azure_storage_account_mismatch",
            urlHost,
            cfgHost,
          });
        }
      } catch (err) {
        logWarn("azure_storage_credentialed_download_failed", {
          code: "azure_storage_credentialed_download_failed",
          error: err instanceof Error ? err.message : "unknown_error",
        });
        // fall through to anonymous attempt
      }
    }
  }
  const client = new BlobClient(url);
  return client.downloadToBuffer();
}

async function downloadAzureBlobFromPath(pathValue: string): Promise<Buffer> {
  const match = /^azure:\/\/([^/]+)\/(.+)$/.exec(pathValue);
  if (!match) {
    throw new Error("invalid_azure_blob_path");
  }
  const connectionString = config.azureStorage.connectionString;
  if (!connectionString) {
    logWarn("azure_storage_missing_connection_string", {
      code: "azure_storage_missing_connection_string",
    });
    throw new Error("missing_azure_storage_connection_string");
  }
  const container = match[1];
  const blobName = match[2];
  if (!container || !blobName) {
    throw new Error("invalid_azure_blob_path");
  }
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobClient = serviceClient.getContainerClient(container).getBlobClient(blobName);
  return blobClient.downloadToBuffer();
}

export function createOcrStorage(): OcrStorage {
  return {
    async fetchBuffer(input: OcrStorageInput): Promise<Buffer> {
      const dataUrlBuffer = parseDataUrl(input.content);
      if (dataUrlBuffer) {
        return dataUrlBuffer;
      }
      if (input.content.startsWith("https://")) {
        if (!isAllowedAzureBlobUrl(input.content)) {
          throw new OcrStorageValidationError(input.content);
        }
        return downloadAzureBlobFromUrl(input.content);
      }
      if (input.content.startsWith("azure://")) {
        return downloadAzureBlobFromPath(input.content);
      }
      if (input.content.startsWith("http://")) {
        throw new OcrStorageValidationError(input.content);
      }
      return Buffer.from(input.content, "base64");
    },
  };
}
