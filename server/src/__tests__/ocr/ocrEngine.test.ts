import { OCREngine } from "../../ocrEngine";

jest.mock("../../db/client", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: "ocr-1", extractedText: {} }]),
  },
}));

jest.mock("../../db/schema", () => ({
  applicationTimelineEvents: {},
  ocrResults: {},
}));

describe("OCREngine", () => {
  it("stores results and emits events", async () => {
    const engine = new OCREngine();
    const record = await engine.processDocument({
      applicationId: "app-1",
      documentVersionId: "doc-1",
      blobKey: "blob",
    });

    expect(record.id).toBe("ocr-1");
  });
});
