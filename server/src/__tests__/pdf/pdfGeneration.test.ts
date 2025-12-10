import { renderCreditSummaryPdf } from "../../ai/creditSummaryEngine";

describe("PDF generation", () => {
  it("returns a buffer", () => {
    const buffer = renderCreditSummaryPdf({ section: "content" });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toContain("content");
  });
});
