"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContainerClient = createContainerClient;
exports.createBlobClient = createBlobClient;
exports.buildDocumentBlobKey = buildDocumentBlobKey;
exports.uploadStream = uploadStream;
exports.generateUploadSas = generateUploadSas;
exports.generateReadSas = generateReadSas;
exports.headBlob = headBlob;
exports.getServiceClient = getServiceClient;
const storage_blob_1 = require("@azure/storage-blob");
const stream_1 = require("stream");
const config_1 = require("../config/config");
function requireAzureBlobConfig() {
    const account = config_1.config.AZURE_BLOB_ACCOUNT ?? process.env.AZURE_BLOB_ACCOUNT;
    const key = config_1.config.AZURE_BLOB_KEY ?? process.env.AZURE_BLOB_KEY;
    const container = config_1.config.AZURE_BLOB_CONTAINER ?? process.env.AZURE_BLOB_CONTAINER;
    // In production, config.ts already enforces these.
    // In non-prod, we allow the app to boot without Azure configured, but any blob call must fail clearly.
    if (!account || !key || !container) {
        throw new Error("Azure Blob is not configured. Missing one or more of: AZURE_BLOB_ACCOUNT, AZURE_BLOB_KEY, AZURE_BLOB_CONTAINER");
    }
    return { account, key, container };
}
let _credential = null;
let _serviceClient = null;
function getCredential() {
    if (_credential)
        return _credential;
    const { account, key } = requireAzureBlobConfig();
    _credential = new storage_blob_1.StorageSharedKeyCredential(account, key);
    return _credential;
}
function getServiceClientInternal() {
    if (_serviceClient)
        return _serviceClient;
    const { account } = requireAzureBlobConfig();
    const credential = getCredential();
    _serviceClient = new storage_blob_1.BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
    return _serviceClient;
}
function createContainerClient(containerName) {
    const { container } = requireAzureBlobConfig();
    const finalContainer = (containerName && containerName.length > 0 ? containerName : container);
    return getServiceClientInternal().getContainerClient(finalContainer);
}
function createBlobClient(blobKey, containerName) {
    return createContainerClient(containerName).getBlockBlobClient(blobKey);
}
function buildDocumentBlobKey(applicationId, documentId, version, originalFileName) {
    return `documents/${applicationId}/${documentId}/v${version}/${originalFileName}`;
}
async function uploadStream(blobKey, content, contentType, containerName) {
    const containerClient = createContainerClient(containerName);
    await containerClient.createIfNotExists();
    const client = containerClient.getBlockBlobClient(blobKey);
    const payloadStream = Buffer.isBuffer(content) ? stream_1.Readable.from(content) : content;
    return client.uploadStream(payloadStream, undefined, undefined, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    });
}
function generateUploadSas(blobKey, expiresInMinutes = 15, containerName) {
    const { container } = requireAzureBlobConfig();
    const finalContainer = containerName && containerName.length > 0 ? containerName : container;
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);
    const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
        containerName: finalContainer,
        blobName: blobKey,
        permissions: storage_blob_1.BlobSASPermissions.parse("cw"),
        expiresOn: expiry,
    }, getCredential()).toString();
    const serviceClient = getServiceClientInternal();
    return `${serviceClient.url}/${finalContainer}/${blobKey}?${sasToken}`;
}
function generateReadSas(blobKey, expiresInMinutes = 15, containerName, asAttachmentName) {
    const { container } = requireAzureBlobConfig();
    const finalContainer = containerName && containerName.length > 0 ? containerName : container;
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + expiresInMinutes);
    const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
        containerName: finalContainer,
        blobName: blobKey,
        permissions: storage_blob_1.BlobSASPermissions.parse("r"),
        expiresOn: expiry,
        contentDisposition: asAttachmentName ? `attachment; filename=${asAttachmentName}` : undefined,
    }, getCredential()).toString();
    const serviceClient = getServiceClientInternal();
    return `${serviceClient.url}/${finalContainer}/${blobKey}?${sasToken}`;
}
async function headBlob(blobKey, containerName) {
    const client = createBlobClient(blobKey, containerName);
    try {
        const properties = await client.getProperties();
        return {
            exists: true,
            contentLength: properties.contentLength ?? null,
            contentType: properties.contentType ?? null,
            metadata: properties.metadata ?? {},
        };
    }
    catch (err) {
        if (err?.statusCode === 404) {
            return { exists: false, contentLength: null, contentType: null, metadata: {} };
        }
        throw err;
    }
}
function getServiceClient() {
    return getServiceClientInternal();
}
