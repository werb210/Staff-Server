"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.headBlob = exports.generateReadSas = exports.generateUploadSas = exports.buildDocumentBlobKey = void 0;
exports.uploadBuffer = uploadBuffer;
exports.uploadStream = uploadStream;
exports.getFile = getFile;
exports.softDeleteFile = softDeleteFile;
exports.generatePresignedUrl = generatePresignedUrl;
const crypto_1 = require("crypto");
const azureBlob_1 = require("./azureBlob");
Object.defineProperty(exports, "buildDocumentBlobKey", { enumerable: true, get: function () { return azureBlob_1.buildDocumentBlobKey; } });
Object.defineProperty(exports, "generateReadSas", { enumerable: true, get: function () { return azureBlob_1.generateReadSas; } });
Object.defineProperty(exports, "generateUploadSas", { enumerable: true, get: function () { return azureBlob_1.generateUploadSas; } });
Object.defineProperty(exports, "headBlob", { enumerable: true, get: function () { return azureBlob_1.headBlob; } });
async function uploadBuffer(blobKey, buffer, contentType) {
    const containerClient = (0, azureBlob_1.createContainerClient)();
    await containerClient.createIfNotExists();
    const client = containerClient.getBlockBlobClient(blobKey);
    const checksum = (0, crypto_1.createHash)("sha256").update(buffer).digest("hex");
    await client.uploadData(buffer, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
        metadata: { checksum },
    });
    return { blobKey, url: client.url, checksum };
}
async function uploadStream(blobKey, stream, contentType) {
    const containerClient = (0, azureBlob_1.createContainerClient)();
    await containerClient.createIfNotExists();
    const client = containerClient.getBlockBlobClient(blobKey);
    return client.uploadStream(stream, undefined, undefined, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    });
}
async function getFile(blobKey) {
    const client = (0, azureBlob_1.createBlobClient)(blobKey);
    const download = await client.download();
    const chunks = [];
    for await (const chunk of download.readableStreamBody || []) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
async function softDeleteFile(blobKey) {
    const client = (0, azureBlob_1.createBlobClient)(blobKey);
    const metadata = {
        ...(await client.getProperties().then((p) => p.metadata).catch(() => ({}))),
        deleted: "true",
        deletedAt: new Date().toISOString(),
    };
    await client.setMetadata(metadata);
    return { blobKey, metadata };
}
function generatePresignedUrl(blobKey, expiresInMinutes) {
    return (0, azureBlob_1.generateReadSas)(blobKey, expiresInMinutes);
}
