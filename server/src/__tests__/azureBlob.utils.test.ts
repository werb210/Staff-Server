import { jest } from "@jest/globals";
import * as azureBlob from "../services/azureBlob";

jest.mock("../services/azureBlob", () => ({
  __esModule: true,
  buildDocumentBlobKey: jest.fn(
    (applicationId: string, documentId: string, version: number, fileName: string) =>
      `documents/${applicationId}/${documentId}/v${version}/${fileName}`,
  ),
  generateUploadSas: jest.fn((blobKey: string, _expires?: number, container?: string) => {
    const base = container ?? "container";
    return `https://example.blob.core.windows.net/${base}/${blobKey}?sas-token`;
  }),
  generateReadSas: jest.fn(
    (blobKey: string, _expires?: number, container?: string, fileName?: string) => {
      const base = container ?? "container";
      const disposition = fileName ? `&rscd=attachment; filename=${fileName}` : "";
      return `https://example.blob.core.windows.net/${base}/${blobKey}?sas-token${disposition}`;
    },
  ),
  headBlob: jest.fn(async () => ({
    exists: true,
    contentLength: 10,
    contentType: "application/pdf",
    metadata: { checksum: "abc" },
  })),
}));

describe("azureBlob utils", () => {
  it("builds deterministic blob keys", () => {
    const key = azureBlob.buildDocumentBlobKey("app-1", "doc-1", 2, "file.pdf");
    expect(key).toBe("documents/app-1/doc-1/v2/file.pdf");
  });

  it("creates upload sas urls", () => {
    const url = azureBlob.generateUploadSas("documents/app/doc/file.pdf", 10, "container");
    expect(url).toContain("documents/app/doc/file.pdf");
    expect(url).toContain("sas-token");
  });

  it("creates read sas urls with disposition", () => {
    const url = azureBlob.generateReadSas("documents/app/doc/file.pdf", 5, "container", "file.pdf");
    expect(url).toContain("sas-token");
    expect(url).toContain("documents/app/doc/file.pdf");
  });

  it("performs head requests", async () => {
    const result = await azureBlob.headBlob("documents/app/doc/file.pdf", "container");
    expect(result.exists).toBe(true);
    expect(result.contentType).toBe("application/pdf");
    expect(result.metadata).toEqual({ checksum: "abc" });
  });
});
