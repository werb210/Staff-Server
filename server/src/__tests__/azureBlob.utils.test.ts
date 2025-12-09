import { buildDocumentBlobKey, generateReadSas, generateUploadSas, headBlob } from "../services/azureBlob";

jest.mock("@azure/storage-blob", () => {
  const getProperties = jest.fn().mockResolvedValue({
    contentLength: 10,
    contentType: "application/pdf",
    metadata: { checksum: "abc" },
  });

  const blockBlobClient = {
    containerClient: { createIfNotExists: jest.fn() },
    uploadStream: jest.fn(),
    getProperties,
  } as any;

  const getBlockBlobClient = jest.fn(() => blockBlobClient);
  const getContainerClient = jest.fn(() => ({ getBlockBlobClient }));

  return {
    BlobServiceClient: class {
      url = "https://example.blob.core.windows.net";
      getContainerClient = getContainerClient;
    },
    ContainerClient: class {},
    StorageSharedKeyCredential: class {},
    BlobSASPermissions: { parse: jest.fn(() => ({ read: true })) },
    generateBlobSASQueryParameters: jest.fn(() => ({ toString: () => "sas-token" })),
  };
});

describe("azureBlob utils", () => {
  it("builds deterministic blob keys", () => {
    const key = buildDocumentBlobKey("app-1", "doc-1", 2, "file.pdf");
    expect(key).toBe("documents/app-1/doc-1/v2/file.pdf");
  });

  it("creates upload sas urls", () => {
    const url = generateUploadSas("documents/app/doc/file.pdf", 10, "container");
    expect(url).toContain("documents/app/doc/file.pdf");
    expect(url).toContain("sas-token");
  });

  it("creates read sas urls with disposition", () => {
    const url = generateReadSas("documents/app/doc/file.pdf", 5, "container", "file.pdf");
    expect(url).toContain("sas-token");
    expect(url).toContain("documents/app/doc/file.pdf");
  });

  it("performs head requests", async () => {
    const result = await headBlob("documents/app/doc/file.pdf", "container");
    expect(result.exists).toBe(true);
    expect(result.contentType).toBe("application/pdf");
    expect(result.metadata).toEqual({ checksum: "abc" });
  });
});
