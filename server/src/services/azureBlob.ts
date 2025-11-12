import {
  BlobServiceClient,
  type ContainerClient,
  BlobDownloadResponseParsed,
} from "@azure/storage-blob";
import type { Response } from "express";
import { pipeline } from "stream/promises";

/* ---------------------------------------------------------------------------
   INTERNAL STATE
--------------------------------------------------------------------------- */

let containerPromise: Promise<ContainerClient> | null = null;

/* ---------------------------------------------------------------------------
   ENV VALIDATION
--------------------------------------------------------------------------- */

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`${key} is not configured`);
  }
  return value.trim();
};

const getConnectionString = (): string =>
  requireEnv("AZURE_STORAGE_CONNECTION_STRING");

const getContainerName = (): string =>
  requireEnv("AZURE_STORAGE_CONTAINER");

/* ---------------------------------------------------------------------------
   CLIENT FACTORY
--------------------------------------------------------------------------- */

const getContainerClient = async (): Promise<ContainerClient> => {
  if (!containerPromise) {
    const service = BlobServiceClient.fromConnectionString(
      getConnectionString()
    );
    const container = service.getContainerClient(getContainerName());

    containerPromise = (async () => {
      await container.createIfNotExists({
        access: "blob",
      });
      return container;
    })();
  }

  return containerPromise;
};

/* ---------------------------------------------------------------------------
   UPLOAD BUFFER
--------------------------------------------------------------------------- */

export const uploadBuffer = async (
  buffer: Buffer,
  blobName: string,
  mimeType?: string
): Promise<void> => {
  if (!blobName || blobName.includes("..")) {
    throw new Error(`Invalid blob name: ${blobName}`);
  }

  const container = await getContainerClient();
  const blob = container.getBlockBlobClient(blobName);

  await blob.uploadData(buffer, {
    blobHTTPHeaders: mimeType
      ? { blobContentType: mimeType }
      : undefined,
    tier: "Hot",
  });
};

/* ---------------------------------------------------------------------------
   DOWNLOAD BUFFER
--------------------------------------------------------------------------- */

export const downloadBuffer = async (blobName: string): Promise<Buffer> => {
  const container = await getContainerClient();
  const blob = container.getBlockBlobClient(blobName);

  const exists = await blob.exists();
  if (!exists) {
    throw new Error(`Blob not found: ${blobName}`);
  }

  let response: BlobDownloadResponseParsed;

  try {
    response = await blob.download();
  } catch (err) {
    throw new Error(`Azure download failed for ${blobName}: ${(err as Error).message}`);
  }

  const stream = response.readableStreamBody;
  if (!stream) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

/* ---------------------------------------------------------------------------
   STREAM A BLOB (PREVIEW / PDF VIEWER)
--------------------------------------------------------------------------- */

export const streamBlob = async (
  blobName: string,
  res: Response
): Promise<void> => {
  const container = await getContainerClient();
  const blob = container.getBlockBlobClient(blobName);

  const exists = await blob.exists();
  if (!exists) {
    res.status(404).end(`Blob not found: ${blobName}`);
    return;
  }

  const response = await blob.download();

  const stream = response.readableStreamBody;
  if (!stream) {
    res.status(500).end("Blob has no stream");
    return;
  }

  /** Ensure clean content headers for browser/PDF/iOS preview */
  if (response.contentType) {
    res.setHeader("Content-Type", response.contentType);
  }

  if (response.contentLength !== undefined) {
    res.setHeader("Content-Length", String(response.contentLength));
  }

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");

  await pipeline(stream, res);
};

/* ---------------------------------------------------------------------------
   EXISTS CHECK
--------------------------------------------------------------------------- */

export const blobExists = async (blobName: string): Promise<boolean> => {
  const container = await getContainerClient();
  return container.getBlockBlobClient(blobName).exists();
};
