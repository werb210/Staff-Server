// Auto-generated stub by Codex
// Minimal Azure Blob storage helper stub

export class AzureBlobClient {
  async upload(): Promise<{ url: string }> {
    return { url: "https://example.com/blob" };
  }
}

export const azureBlobClient = new AzureBlobClient();
