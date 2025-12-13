import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { Readable } from "stream";
import { config } from "../config/config";

type AzureBlobRequired = {
  account: string;
  key: string;
  container: string;
};

function requireAzureBlobConfig(): AzureBlobRequired {
  const account = config.AZURE_BLOB_ACCOUNT;
  const key = config.AZURE_BLOB_KEY;
  const container = config.AZURE_BLOB_CONTAINER;

  // In production, config.ts already enforces these.
  // In non-prod, we allow the app to boot without Azure configured, but any blob call must fail clearly.
  if (!account || !key || !container) {
    throw new Error(
      "Azure Blob is not configured. Missing one or more of: AZURE_BLOB_ACCOUNT, AZURE_BLOB_KEY, AZURE_BLOB_CONTAINER",
    );
  }

  return { account, key, container };
}

let _credential: StorageSharedKeyCredential | null = null;
let _serviceClient: BlobServiceClient | null = null;

function getCredential(): StorageSharedKeyCredential {
  if (_credential) return _credential;
  const { account, key } = requireAzureBlobConfig();
  _credential = new StorageSharedKeyCredential(account, key);
  return _credential;
}

function getServiceClientInternal(): BlobServiceClient {
  if (_serviceClient) return _serviceClient;
  const { account } = requireAzureBlobConfig();
  const credential = getCredential();
  _serviceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
  return _serviceClient;
}

export function createContainerClient(containerName?: string): ContainerClient {
  const { container } = requireAzureBlobConfig();
  const finalContainer = (containerName && containerName.length > 0 ? containerName : container) as string;
  return getServiceClientInternal().getContainerClient(finalContainer);
}

export function createBlobClient(blobKey: string, containerName?: string) {
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
  containerName?: string,
) {
  const containerClient = createContainerClient(containerName);
  await containerClient.createIfNotExists();

  const client = containerClient.getBlockBlobClient(blobKey);
  const payloadStream = Buffer.isBuffer(content) ? Readable.from(content) : content;

  return client.uploadStream(payloadStream, undefined, undefined, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
  });
}

export function generateUploadSas(blobKey: string, expiresInMinutes = 15, containerName?: string) {
  const { container } = requireAzureBlobConfig();
  const finalContainer = containerName && containerName.length > 0 ? containerName : container;

  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: finalContainer,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn: expiry,
    },
    getCredential(),
  ).toString();

  const serviceClient = getServiceClientInternal();
  return `${serviceClient.url}/${finalContainer}/${blobKey}?${sasToken}`;
}

export function generateReadSas(
  blobKey: string,
  expiresInMinutes = 15,
  containerName?: string,
  asAttachmentName?: string,
) {
  const { container } = requireAzureBlobConfig();
  const finalContainer = containerName && containerName.length > 0 ? containerName : container;

  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: finalContainer,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: expiry,
      contentDisposition: asAttachmentName ? `attachment; filename=${asAttachmentName}` : undefined,
    },
    getCredential(),
  ).toString();

  const serviceClient = getServiceClientInternal();
  return `${serviceClient.url}/${finalContainer}/${blobKey}?${sasToken}`;
}

export async function headBlob(blobKey: string, containerName?: string) {
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
  return getServiceClientInternal();
}
