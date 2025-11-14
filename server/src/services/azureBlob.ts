import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const parseConnectionString = (value: string) => {
  const entries = value
    .split(";")
    .map((part) => part.split("=", 2))
    .filter((tuple): tuple is [string, string] => tuple.length === 2 && tuple[0].length > 0);
  return Object.fromEntries(entries) as Record<string, string>;
};

interface ClientBundle {
  containerName: string;
  containerClient: ContainerClient;
  sharedKeyCredential: StorageSharedKeyCredential | null;
}

let cachedBundle: ClientBundle | null = null;

const resolveClients = (): ClientBundle => {
  if (cachedBundle) return cachedBundle;

  const connectionString =
    process.env.AZURE_STORAGE_CONNECTION ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION is required for blob operations");
  }

  const containerName = process.env.AZURE_BLOB_CONTAINER ?? "documents";
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const connectionParts = parseConnectionString(connectionString);
  const accountName =
    connectionParts.AccountName ?? process.env.AZURE_STORAGE_ACCOUNT ?? "";
  const accountKey = connectionParts.AccountKey ?? process.env.AZURE_STORAGE_KEY ?? "";

  const sharedKeyCredential =
    accountName && accountKey
      ? new StorageSharedKeyCredential(accountName, accountKey)
      : null;

  cachedBundle = { containerName, containerClient, sharedKeyCredential };
  return cachedBundle;
};

const ensureContainer = async () => {
  const { containerClient } = resolveClients();
  await containerClient.createIfNotExists();
};

const streamToBuffer = async (readable: NodeJS.ReadableStream | null | undefined) => {
  if (!readable) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const uploadBufferToAzure = async (
  buffer: Buffer,
  key: string,
  mime: string,
) => {
  const { containerClient } = resolveClients();
  await ensureContainer();
  const blob = containerClient.getBlockBlobClient(key);
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mime } });
  return blob.url;
};

export const downloadBufferFromAzure = async (key: string) => {
  const { containerClient } = resolveClients();
  await ensureContainer();
  const blob = containerClient.getBlockBlobClient(key);
  const response = await blob.download();
  return streamToBuffer(response.readableStreamBody);
};

export const getBlobUrl = (key: string) => {
  const { containerClient } = resolveClients();
  const blob = containerClient.getBlockBlobClient(key);
  return blob.url;
};

const ensureSharedKey = () => {
  const { sharedKeyCredential } = resolveClients();
  if (!sharedKeyCredential) {
    throw new Error(
      "Azure Storage shared key credentials are required to generate SAS URLs",
    );
  }
  return sharedKeyCredential;
};

const generateBlobSasUrl = (
  key: string,
  permissions: BlobSASPermissions,
  expiresInSeconds = 15 * 60,
) => {
  const { containerClient, containerName } = resolveClients();
  const credential = ensureSharedKey();
  const blobClient = containerClient.getBlockBlobClient(key);
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);
  const startsOn = new Date(Date.now() - 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: key,
      permissions,
      protocol: SASProtocol.Https,
      startsOn,
      expiresOn,
    },
    credential,
  );

  return `${blobClient.url}?${sas.toString()}`;
};

export const generateUploadSasUrl = (key: string, expiresInSeconds?: number) =>
  generateBlobSasUrl(
    key,
    BlobSASPermissions.parse("cw"),
    expiresInSeconds,
  );

export const generateDownloadSasUrl = (key: string, expiresInSeconds?: number) =>
  generateBlobSasUrl(
    key,
    BlobSASPermissions.parse("r"),
    expiresInSeconds,
  );

// Backwards compatible names
export const uploadBuffer = async (key: string, buffer: Buffer, mime: string) =>
  uploadBufferToAzure(buffer, key, mime);

export const downloadBuffer = async (key: string) =>
  downloadBufferFromAzure(key);
