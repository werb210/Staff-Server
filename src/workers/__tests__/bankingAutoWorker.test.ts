// BF_AZURE_OCR_TERMSHEET_v44 — banking analysis pure-function test
import { describe, it, expect } from "vitest";
import { analyzeBankStatements } from "../../services/bankingAnalysis.service.js";

describe("BF_AZURE_OCR_TERMSHEET_v44 banking analysis", () => {
  it("computes nsf_count, monthly_revenue, revenue_trend", () => {
    const r = analyzeBankStatements({
      applicationId: "app-1",
      transactions: [
        { balance: 1000, credit: 500, type: "deposit" },
        { balance: 1200, credit: 700, type: "deposit" },
        { balance: 900,  credit: 0,   type: "NSF charge" },
        { balance: 1500, credit: 1200, type: "deposit" },
      ],
    });
    expect(r.applicationId).toBe("app-1");
    expect(r.nsf_count).toBe(1);
    expect(r.monthly_revenue).toBe(2400);
    expect(["up", "down"]).toContain(r.revenue_trend);
  });
  it("handles empty input safely", () => {
    const r = analyzeBankStatements({ applicationId: "x", transactions: [] });
    expect(r.avg_balance).toBe(0);
    expect(r.monthly_revenue).toBe(0);
  });
});
