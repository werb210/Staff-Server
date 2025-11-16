// server/src/services/documentService.ts
import { azureBlob } from "./azureBlob.js";

export const documentService = {
  async upload(buffer: Buffer, filename: string) {
    const key = `docs/${Date.now()}-${filename}`;
    const uploaded = await azureBlob.upload(buffer, key);
    return uploaded;
  },
};
