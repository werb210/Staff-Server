// BF_CREDIT_SUMMARY_v45 — pure-function tests for buildSectionsFromInputs.
import { describe, it, expect } from "vitest";
import { buildSectionsFromInputs, type GenerationInputs } from "../generateCreditSummary.js";

function baseInput(overrides: Partial<GenerationInputs> = {}): GenerationInputs {
  return {
    applicationId: "app-123",
    application: {
      name: "ABC Construction Ltd.",
      requested_amount: 1_515_000,
      industry: "Construction",
      product_category: "Equipment Financing",
      product_type: "Capex",
      pipeline_state: "In Review",
      metadata: {
        address_line1: "4200 Gerald St",
        city: "Ottawa",
        province: "ON",
        postal_code: "K1J 8A4",
        principals: [
          { first_name: "Joshua", last_name: "Bryant" },
          { first_name: "Alex",   last_name: "Carter" },
        ],
        website: "www.abc-construction.ca",
        term: "60 months",
        structure: "PG, GSA",
        collateral_value: 1_900_000,
        formation_date: "2016",
        use_of_funds: "to purchase additional heavy machinery and vehicles",
        financials: {
          years: ["2021", "2022", "2023"],
          rows: [
            { label: "Revenue", "2021": 1_950_000, "2022": 2_250_000, "2023": 2_300_000 },
            { label: "EBITDA",  "2021": 170_000,   "2022": 225_000,   "2023": 200_000 },
          ],
        },
      },
    },
    documentCounts: { "Bank Statements": 6, "Financials": 2 },
    bankingMetrics: { avg_balance: 50000, nsf_count: 0, monthly_revenue: 192000, revenue_trend: "up", documents_analyzed: 6 },
    ...overrides,
  };
}

describe("BF_CREDIT_SUMMARY_v45 buildSectionsFromInputs", () => {
  it("produces all 6 sections with correct shape", () => {
    const s = buildSectionsFromInputs(baseInput());
    expect(Object.keys(s).sort()).toEqual([
      "application_overview",
      "banking_analysis",
      "business_overview",
      "financial_overview",
      "recommendation",
      "transaction",
    ]);
    expect(s.application_overview.applicant_name).toBe("ABC Construction Ltd.");
    expect(s.application_overview.loan_amount).toBe(1_515_000);
    expect(s.application_overview.principals).toEqual(["Joshua Bryant", "Alex Carter"]);
    expect(s.application_overview.address).toBe("4200 Gerald St, Ottawa, ON, K1J 8A4");
    expect(s.application_overview.ltv).toBeCloseTo(79.7, 1);
    expect(s.application_overview.industry).toBe("Construction");
  });

  it("transaction narrative cites the requested amount and purpose", () => {
    const s = buildSectionsFromInputs(baseInput());
    expect(s.transaction.narrative).toMatch(/\$1,515,000/);
    expect(s.transaction.narrative).toMatch(/heavy machinery/);
  });

  it("financial_overview surfaces the years + non-empty rows", () => {
    const s = buildSectionsFromInputs(baseInput());
    expect(s.financial_overview.table.headers).toEqual(["2021", "2022", "2023"]);
    const revenue = s.financial_overview.table.rows.find((r) => r.label === "Revenue");
    expect(revenue?.values).toEqual([1_950_000, 2_250_000, 2_300_000]);
    expect(s.financial_overview.narrative).toMatch(/\$1,950,000/);
  });

  it("banking_analysis reflects metrics when present", () => {
    const s = buildSectionsFromInputs(baseInput());
    expect(s.banking_analysis.metrics.documents_analyzed).toBe(6);
    expect(s.banking_analysis.narrative).toMatch(/improving/);
  });

  it("recommendation flags review when amount exceeds 24× monthly revenue", () => {
    const s = buildSectionsFromInputs(baseInput({
      bankingMetrics: { avg_balance: 5000, nsf_count: 0, monthly_revenue: 10_000, revenue_trend: "up", documents_analyzed: 1 },
    }));
    expect(s.recommendation.recommended_action).toBe("review");
    expect(s.recommendation.narrative).toMatch(/24 months/);
  });

  it("recommendation flags needs_more_info when no documents", () => {
    const s = buildSectionsFromInputs(baseInput({ documentCounts: {} }));
    expect(s.recommendation.recommended_action).toBe("needs_more_info");
  });

  it("handles missing metadata gracefully (no crashes, sensible nulls)", () => {
    const s = buildSectionsFromInputs(baseInput({
      application: {
        name: null, requested_amount: null, industry: null,
        product_category: null, product_type: null, pipeline_state: null, metadata: null,
      },
      documentCounts: {},
      bankingMetrics: null,
    }));
    expect(s.application_overview.applicant_name).toBeNull();
    expect(s.application_overview.principals).toEqual([]);
    expect(s.application_overview.ltv).toBeNull();
    expect(s.banking_analysis.narrative).toMatch(/No bank statements/);
  });
});
