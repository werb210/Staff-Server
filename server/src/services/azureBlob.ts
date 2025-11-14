import { BlobServiceClient } from "@azure/storage-blob";

const containerName = process.env.AZURE_BLOB_CONTAINER!;
const client = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION!
);

const streamToBuffer = async (readable: NodeJS.ReadableStream | null | undefined) => {
  if (!readable) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const uploadBuffer = async (key: string, buffer: Buffer, mime: string) => {
  const container = client.getContainerClient(containerName);
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(key);
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mime } });
};

export const downloadBuffer = async (key: string) => {
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(key);

  const resp = await blob.download();
  return streamToBuffer(resp.readableStreamBody);
};
