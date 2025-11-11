import { ocrService } from "../services/ocrService.js";

describe("ocrService", () => {
  it("summarises document text", () => {
    const result = ocrService.analyze("Sample text for OCR");
    expect(result.text).toContain("Sample text");
    expect(result.summary).toContain("Sample text");
  });
});
