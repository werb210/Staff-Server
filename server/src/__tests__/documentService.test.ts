import { documentService } from "../services/documentService.js";

describe("documentService", () => {
  it("lists seeded documents", () => {
    const documents = documentService.listDocuments();
    expect(documents.length).toBeGreaterThan(0);
  });

  it("saves documents with checksum and blob url", () => {
    const saved = documentService.saveDocument({
      applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
      fileName: "test.pdf",
      contentType: "application/pdf",
    });

    expect(saved.checksum).toHaveLength(64);
    expect(saved.blobUrl).toContain("https://example.blob.core.windows.net");
  });

  it("returns status snapshots", () => {
    const [first] = documentService.listDocuments();
    const status = documentService.getDocumentStatus(first.id);
    expect(status.status).toBe(first.status);
  });
});
