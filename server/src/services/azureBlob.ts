import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { Readable } from "stream";
import { config } from "../config/config";

const credential = new StorageSharedKeyCredential(config.AZURE_BLOB_ACCOUNT, config.AZURE_BLOB_KEY);
const serviceClient = new BlobServiceClient(`https://${config.AZURE_BLOB_ACCOUNT}.blob.core.windows.net`, credential);

export function createContainerClient(containerName: string = config.AZURE_BLOB_CONTAINER): ContainerClient {
  return serviceClient.getContainerClient(containerName);
}

export function createBlobClient(blobKey: string, containerName: string = config.AZURE_BLOB_CONTAINER) {
  return createContainerClient(containerName).getBlockBlobClient(blobKey);
}

export function buildDocumentBlobKey(
  applicationId: string,
  documentId: string,
  version: number,
  originalFileName: string,
) {
  return `documents/${applicationId}/${documentId}/v${version}/${originalFileName}`;
}

export async function uploadStream(
  blobKey: string,
  content: Buffer | Readable,
  contentType?: string,
  containerName: string = config.AZURE_BLOB_CONTAINER,
) {
  const containerClient = createContainerClient(containerName);
  await containerClient.createIfNotExists();
  const client = containerClient.getBlockBlobClient(blobKey);
  const payloadStream = Buffer.isBuffer(content) ? Readable.from(content) : content;
  return client.uploadStream(payloadStream, undefined, undefined, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
  });
}

export function generateUploadSas(blobKey: string, expiresInMinutes = 15, containerName = config.AZURE_BLOB_CONTAINER) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn: expiry,
    },
    credential,
  ).toString();

  return `${serviceClient.url}/${containerName}/${blobKey}?${sasToken}`;
}

export function generateReadSas(
  blobKey: string,
  expiresInMinutes = 15,
  containerName = config.AZURE_BLOB_CONTAINER,
  asAttachmentName?: string,
) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: expiry,
      contentDisposition: asAttachmentName ? `attachment; filename=${asAttachmentName}` : undefined,
    },
    credential,
  ).toString();

  return `${serviceClient.url}/${containerName}/${blobKey}?${sasToken}`;
}

export async function headBlob(blobKey: string, containerName = config.AZURE_BLOB_CONTAINER) {
  const client = createBlobClient(blobKey, containerName);
  try {
    const properties = await client.getProperties();
    return {
      exists: true,
      contentLength: properties.contentLength ?? null,
      contentType: properties.contentType ?? null,
      metadata: properties.metadata ?? {},
    };
  } catch (err: any) {
    if (err?.statusCode === 404) {
      return { exists: false, contentLength: null, contentType: null, metadata: {} };
    }
    throw err;
  }
}

export function getServiceClient() {
  return serviceClient;
}

