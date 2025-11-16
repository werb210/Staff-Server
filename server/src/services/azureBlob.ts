// server/src/services/azureBlob.ts
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import env from "../utils/env.js";
import { Readable } from "stream";

// -----------------------------------------------------
// INIT AZURE BLOB SERVICE
// -----------------------------------------------------
const connectionString = env.AZURE_BLOB_CONNECTION_STRING;
const containerName = env.AZURE_BLOB_CONTAINER;

if (!connectionString) throw new Error("Missing AZURE_BLOB_CONNECTION_STRING");
if (!containerName) throw new Error("Missing AZURE_BLOB_CONTAINER");

// parse account + key from connection string
function parseConnectionString(cs: string) {
  const parts = cs.split(";");
  const account = parts.find((p) => p.startsWith("AccountName="))?.split("=")[1];
  const key = parts.find((p) => p.startsWith("AccountKey="))?.split("=")[1];
  if (!account || !key) throw new Error("Invalid Azure connection string");
  return { account, key };
}

const { account, key } = parseConnectionString(connectionString);
const sharedKey = new StorageSharedKeyCredential(account, key);

const blobService = BlobServiceClient.fromConnectionString(connectionString);
const container = blobService.getContainerClient(containerName);

// Ensure container exists
export async function ensureContainer() {
  await container.createIfNotExists();
}

// -----------------------------------------------------
// UPLOAD BUFFER
// -----------------------------------------------------
export async function uploadBuffer(
  key: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  await ensureContainer();
  const block = container.getBlockBlobClient(key);

  await block.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return key;
}

// -----------------------------------------------------
// DOWNLOAD AS RAW BUFFER
// -----------------------------------------------------
export async function getBuffer(key: string): Promise<Buffer | null> {
  const block = container.getBlockBlobClient(key);
  if (!(await block.exists())) return null;

  const dl = await block.download();
  const chunks: Uint8Array[] = [];

  for await (const chunk of dl.readableStreamBody as any) {
    chunks.push(chunk instanceof Buffer ? new Uint8Array(chunk) : chunk);
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const buf = Buffer.alloc(total);
  let offset = 0;

  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.length;
  }

  return buf;
}

// -----------------------------------------------------
// STREAM FOR PREVIEW
// -----------------------------------------------------
export async function getStream(key: string): Promise<Readable | null> {
  const block = container.getBlockBlobClient(key);
  if (!(await block.exists())) return null;

  const dl = await block.download();
  return dl.readableStreamBody as Readable;
}

// -----------------------------------------------------
// GET SAS (SIGNED URL)
// -----------------------------------------------------
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const block = container.getBlockBlobClient(key);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: key,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
    },
    sharedKey
  ).toString();

  return `${block.url}?${sas}`;
}

// EXPORT DEFAULT
export default {
  uploadBuffer,
  getBuffer,
  getStream,
  getPresignedUrl,
};
