import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} from '@azure/storage-blob';
import crypto from 'crypto';

let blobServiceClient: BlobServiceClient;
let containerClient: any;
let containerName = '';

export function initAzureBlob(config: {
  accountName: string;
  accountKey: string;
  containerName: string;
}) {
  const { accountName, accountKey } = config;
  containerName = config.containerName;

  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );

  containerClient = blobServiceClient.getContainerClient(containerName);

  console.log(`📦 Azure Blob initialized → container: ${containerName}`);
}

//
// ======================================================
//  Generate Safe Blob Path
// ======================================================
//
function buildBlobKey(applicationId: string, documentId: string, fileName: string) {
  // Avoid dangerous characters
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `${applicationId}/${documentId}/${Date.now()}_${safeName}`;
}

//
// ======================================================
//  Calculate SHA256
// ======================================================
//
export async function sha256(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

//
// ======================================================
//  Upload File to Azure Blob
// ======================================================
//
export async function uploadFile(
  applicationId: string,
  documentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
) {
  const blobKey = buildBlobKey(applicationId, documentId, fileName);

  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobKey);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  const checksum = await sha256(buffer);

  return {
    blobKey,
    checksum,
    sizeBytes: buffer.length,
  };
}

//
// ======================================================
//  Generate SAS URL (Preview/Download)
// ======================================================
//
export async function getSasUrl(blobKey: string) {
  const tenMinutes = 60 * 10;
  const now = new Date();

  const expiresOn = new Date(now.valueOf() + tenMinutes * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: now,
      expiresOn,
    },
    (blobServiceClient as any).credential
  ).toString();

  const url = `${containerClient.getBlockBlobClient(blobKey).url}?${sasToken}`;

  return url;
}

//
// ======================================================
//  Check If Blob Exists
// ======================================================
//
export async function exists(blobKey: string) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobKey);
  return await blockBlobClient.exists();
}
