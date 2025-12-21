import { createHash } from "crypto";
import { buildDocumentBlobKey, createContainerClient, createBlobClient, generateReadSas, generateUploadSas, headBlob, } from "./azureBlob";
export { buildDocumentBlobKey, generateUploadSas, generateReadSas, headBlob };
export async function uploadBuffer(blobKey, buffer, contentType) {
    const containerClient = createContainerClient();
    await containerClient.createIfNotExists();
    const client = containerClient.getBlockBlobClient(blobKey);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    await client.uploadData(buffer, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
        metadata: { checksum },
    });
    return { blobKey, url: client.url, checksum };
}
export async function uploadStream(blobKey, stream, contentType) {
    const containerClient = createContainerClient();
    await containerClient.createIfNotExists();
    const client = containerClient.getBlockBlobClient(blobKey);
    return client.uploadStream(stream, undefined, undefined, {
        blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    });
}
export async function getFile(blobKey) {
    const client = createBlobClient(blobKey);
    const download = await client.download();
    const chunks = [];
    for await (const chunk of download.readableStreamBody || []) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
export async function softDeleteFile(blobKey) {
    const client = createBlobClient(blobKey);
    const metadata = {
        ...(await client.getProperties().then((p) => p.metadata).catch(() => ({}))),
        deleted: "true",
        deletedAt: new Date().toISOString(),
    };
    await client.setMetadata(metadata);
    return { blobKey, metadata };
}
export function generatePresignedUrl(blobKey, expiresInMinutes) {
    return generateReadSas(blobKey, expiresInMinutes);
}
