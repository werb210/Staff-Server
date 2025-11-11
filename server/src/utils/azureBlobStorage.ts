/**
 * AzureBlobStorage provides stubbed helpers for working with Azure Blob Storage.
 */
class AzureBlobStorage {
  /**
   * Pretends to upload a file and returns the blob URL.
   */
  public async uploadFile(options: {
    container: string;
    blobName: string;
    content: Buffer | string;
  }): Promise<{ url: string; status: "uploaded" }> {
    const url = `https://example.blob.core.windows.net/${options.container}/${options.blobName}`;
    return { url, status: "uploaded" };
  }

  /**
   * Generates a synthetic Shared Access Signature URL for a blob.
   */
  public generateSasUrl(container: string, blobName: string): string {
    return `https://example.blob.core.windows.net/${container}/${blobName}?sas-token=stub`;
  }

  /**
   * Returns an upload URL that front-ends can use to stream files directly to storage.
   */
  public createUploadUrl(container: string, blobName: string): {
    uploadUrl: string;
    expiresAt: string;
  } {
    return {
      uploadUrl: this.generateSasUrl(container, `${blobName}?comp=block&upload`),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }
}

export const azureBlobStorage = new AzureBlobStorage();

export type AzureBlobStorageType = AzureBlobStorage;
