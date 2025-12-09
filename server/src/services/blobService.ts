import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import { randomUUID, createHash } from "crypto";
import { config } from "../config/config";

const credential = new StorageSharedKeyCredential(config.AZURE_BLOB_ACCOUNT, config.AZURE_BLOB_KEY);
const serviceClient = new BlobServiceClient(
  `https://${config.AZURE_BLOB_ACCOUNT}.blob.core.windows.net`,
  credential,
);

function getContainerClient(container = config.AZURE_BLOB_CONTAINER) {
  return serviceClient.getContainerClient(container);
}

export async function uploadBuffer(path: string, buffer: Buffer, contentType?: string) {
  const container = getContainerClient();
  await container.createIfNotExists();
  const blobClient = container.getBlockBlobClient(path);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    metadata: { checksum },
  });
  return { path, url: blobClient.url, checksum };
}

export async function getFile(path: string) {
  const container = getContainerClient();
  const blobClient = container.getBlobClient(path);
  const download = await blobClient.download();
  const chunks: Buffer[] = [];
  for await (const chunk of download.readableStreamBody || []) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function softDeleteFile(path: string) {
  const container = getContainerClient();
  const blobClient = container.getBlobClient(path);
  const metadata = { ...(await blobClient.getProperties().then((p) => p.metadata).catch(() => ({} as Record<string, string | undefined>))), deleted: "true", deletedAt: new Date().toISOString() };
  await blobClient.setMetadata(metadata);
  return { path, metadata };
}

export function generatePresignedUrl(path: string, expiresInMinutes = 15) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: config.AZURE_BLOB_CONTAINER,
      blobName: path,
      expiresOn: expiry,
      permissions: BlobSASPermissions.parse("r"),
    },
    credential,
  ).toString();
  return `${serviceClient.url}/${config.AZURE_BLOB_CONTAINER}/${path}?${sasToken}`;
}

export function buildBlobPath(fileName: string) {
  const id = randomUUID();
  return `uploads/${id}/${fileName}`;
}
