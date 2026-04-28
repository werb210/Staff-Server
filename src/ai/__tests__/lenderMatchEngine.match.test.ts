// BF_LENDER_MATCH_v42 — Block 42-A
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deps } from "../../system/deps.js";
import { matchLenders } from "../lenderMatchEngine.js";

const baseRows = [
  { product_id: "p_us", lender_id: "l_us", lender_name: "US Bank", product_name: "US Term", product_category: "TERM_LOAN", country: "US", active: true, min_amount: 50_000, max_amount: 500_000, submission_method: "API" },
  { product_id: "p_ca", lender_id: "l_ca", lender_name: "CA Bank", product_name: "CA Term", product_category: "TERM_LOAN", country: "CA", active: true, min_amount: 50_000, max_amount: 500_000, submission_method: "API" },
  { product_id: "p_both", lender_id: "l_both", lender_name: "Both Bank", product_name: "Both Term", product_category: "TERM_LOAN", country: "BOTH", active: true, min_amount: 50_000, max_amount: 500_000, submission_method: "API" },
];

beforeEach(() => {
  deps.db.ready = true;
  deps.db.client = { query: vi.fn().mockResolvedValue({ rows: baseRows }) };
});

describe("matchLenders geography (regression for v42 inversion bug)", () => {
  it("US applicant: passes US + BOTH, excludes CA", async () => {
    const out = await matchLenders({ country: "US", province: "NY", requestedAmount: 100_000 });
    expect(out.map((m) => m.id).sort()).toEqual(["p_both", "p_us"].sort());
  });

  it("CA applicant: passes CA + BOTH, excludes US", async () => {
    const out = await matchLenders({ country: "CA", province: "AB", requestedAmount: 100_000 });
    expect(out.map((m) => m.id).sort()).toEqual(["p_both", "p_ca"].sort());
  });

  it("country unknown: passes everything (permissive)", async () => {
    const out = await matchLenders({ country: null, requestedAmount: 100_000 });
    expect(out.map((m) => m.id).sort()).toEqual(["p_both", "p_ca", "p_us"].sort());
  });

  it("amount above product max excludes that product", async () => {
    const out = await matchLenders({ country: "US", requestedAmount: 1_000_000 });
    expect(out.find((m) => m.id === "p_us")).toBeUndefined();
  });

  it("returns LenderMatch shape the portal LendersTab expects", async () => {
    const out = await matchLenders({ country: "US", requestedAmount: 100_000 });
    expect(out[0]).toMatchObject({
      id: expect.any(String), lenderId: expect.any(String), lenderName: expect.any(String),
      productName: expect.any(String), productCategory: expect.any(String),
      matchPercent: expect.any(Number), reasoning: expect.any(String),
    });
  });
});
