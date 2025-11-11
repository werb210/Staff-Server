import { pdfService } from "../services/pdfService.js";

describe("pdfService", () => {
  it("generates package metadata", () => {
    const result = pdfService.generatePackage({
      applicationId: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
      documentIds: ["doc-1"],
    });

    expect(result.jobId).toContain("pdf-");
    expect(result.downloadUrl).toContain("https://example.blob.core.windows.net");
  });
});
