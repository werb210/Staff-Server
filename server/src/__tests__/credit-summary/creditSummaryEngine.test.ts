import { AIEngine, AIProvider } from "../../ai/aiEngine";
import { CreditSummaryEngine, renderCreditSummaryPdf } from "../../ai/creditSummaryEngine";

class FixedProvider implements AIProvider {
  name = "fixed";
  async complete({ prompt }: { prompt: string }) {
    return `completed:${prompt}`;
  }
}

describe("CreditSummaryEngine", () => {
  it("generates sequential versions", async () => {
    const engine = new CreditSummaryEngine(new FixedProvider(), {
      async latestVersion() {
        return 1;
      },
      async saveSummary() {
        return;
      },
      async updateApplicationVersion() {
        return;
      },
      async logEvent() {
        return;
      },
    } as any, new AIEngine(new FixedProvider(), { logWriter: { async logInteraction() {} } as any, templatesDir: "src/ai/templates" }));

    const result = await engine.generate({
      applicationId: "app-123",
      context: { businessOverview: "Test Co" },
    });

    expect(result.version).toBe(2);
    expect(result.pdfBlobKey).toContain("credit-summary");
  });

  it("creates a pdf buffer", () => {
    const buffer = renderCreditSummaryPdf({ hello: "world" });
    expect(buffer.toString()).toContain("hello");
  });
});
