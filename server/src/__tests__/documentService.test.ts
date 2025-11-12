import type { Response } from "express";
import { createDocumentService } from "../services/documentService.js";
import type { AzureBlobServiceType } from "../services/azureBlob.js";

const createStubStorage = (): AzureBlobServiceType => {
  const store = new Map<string, Buffer>();
  return {
    async uploadFile(buffer, fileName) {
      store.set(fileName, Buffer.from(buffer));
      return { blobName: fileName, url: `https://example/${fileName}` };
    },
    async downloadFile(blobName) {
      return store.get(blobName) ?? Buffer.alloc(0);
    },
    async streamFile(blobName, res: Response) {
      const data = store.get(blobName) ?? Buffer.alloc(0);
      res.send(data);
    },
    async exists(blobName) {
      return store.has(blobName);
    },
    async deleteFile(blobName) {
      store.delete(blobName);
    },
  };
};

const createService = () =>
  createDocumentService({
    storage: createStubStorage(),
  });

describe("documentService", () => {
  it("lists seeded documents", () => {
    const service = createService();
    const documents = service.listDocuments();
    expect(documents.length).toBeGreaterThan(0);
    expect(documents[0].blobName).toContain(documents[0].id);
  });

  it("saves documents with checksum and blob name", () => {
    const service = createService();
    const saved = service.saveDocument({
      applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
      fileName: "test.pdf",
      contentType: "application/pdf",
    });

    expect(saved.checksum).toHaveLength(64);
    expect(saved.blobName).toContain(saved.id);
  });

  it("returns status snapshots", () => {
    const service = createService();
    const [first] = service.listDocuments();
    const status = service.getStatus(first.id);
    expect(status.status).toBe(first.status);
  });

  it("uploads document content to storage", async () => {
    const service = createService();
    const buffer = Buffer.from("hello world");

    const uploaded = await service.uploadDocument({
      applicationId: "a5fdd1c8-4a1f-4ddc-9bd6-7e3cb59f62cf",
      fileName: "hello.pdf",
      contentType: "application/pdf",
      data: buffer,
    });

    expect(uploaded.blobName).toContain(uploaded.id);

    const download = await service.downloadDocument(uploaded.id);
    expect(download.buffer.toString()).toBe("hello world");
    expect(download.version.version).toBe(uploaded.version);
  });
});
