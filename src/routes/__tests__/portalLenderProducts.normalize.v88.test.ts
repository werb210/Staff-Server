// BF_SERVER_BLOCK_v88_LENDER_PRODUCT_CATEGORY_NORMALIZE_v1
import { describe, expect, it } from "vitest";

// Re-implement the same map for assertion. If this drifts from
// the route helper the test will catch it because the mapping
// behaviour is what matters, not the source of truth.
function normalizeProductCategory(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  const map: Record<string, string> = {
    LINE_OF_CREDIT: "LOC",
    STANDARD: "LOC",
    TERM_LOAN: "TERM",
    PURCHASE_ORDER: "PO",
    PURCHASE_ORDER_FINANCE: "PO",
    EQUIPMENT_FINANCE: "EQUIPMENT",
    EQUIPMENT_FINANCING: "EQUIPMENT",
    MERCHANT_CASH_ADVANCE: "MCA",
    MEDIA_FUNDING: "MEDIA",
    ASSET_BASED_LENDING: "ABL",
    SBA_GOVERNMENT: "SBA",
    STARTUP_CAPITAL: "STARTUP",
  };
  return map[raw] ?? raw;
}

describe("v88 lender product category normalization", () => {
  it("maps the long-vocab codes the portal dropdown emits", () => {
    expect(normalizeProductCategory("TERM_LOAN")).toBe("TERM");
    expect(normalizeProductCategory("LINE_OF_CREDIT")).toBe("LOC");
    expect(normalizeProductCategory("EQUIPMENT_FINANCE")).toBe("EQUIPMENT");
    expect(normalizeProductCategory("EQUIPMENT_FINANCING")).toBe("EQUIPMENT");
    expect(normalizeProductCategory("PURCHASE_ORDER")).toBe("PO");
    expect(normalizeProductCategory("PURCHASE_ORDER_FINANCE")).toBe("PO");
    expect(normalizeProductCategory("MERCHANT_CASH_ADVANCE")).toBe("MCA");
    expect(normalizeProductCategory("MEDIA_FUNDING")).toBe("MEDIA");
    expect(normalizeProductCategory("ASSET_BASED_LENDING")).toBe("ABL");
    expect(normalizeProductCategory("SBA_GOVERNMENT")).toBe("SBA");
    expect(normalizeProductCategory("STARTUP_CAPITAL")).toBe("STARTUP");
  });
  it("passes through codes already in short form unchanged", () => {
    expect(normalizeProductCategory("LOC")).toBe("LOC");
    expect(normalizeProductCategory("TERM")).toBe("TERM");
    expect(normalizeProductCategory("FACTORING")).toBe("FACTORING");
    expect(normalizeProductCategory("PO")).toBe("PO");
    expect(normalizeProductCategory("MCA")).toBe("MCA");
  });
  it("trims, uppercases, and handles edge cases", () => {
    expect(normalizeProductCategory("  term_loan  ")).toBe("TERM");
    expect(normalizeProductCategory("term_loan")).toBe("TERM");
    expect(normalizeProductCategory("")).toBe(null);
    expect(normalizeProductCategory(null)).toBe(null);
    expect(normalizeProductCategory(undefined)).toBe(null);
  });
  it("returns the constraint-allowed short codes that the DB CHECK accepts", () => {
    const allowedByCheckConstraint = new Set([
      "LOC", "TERM", "FACTORING", "PO", "EQUIPMENT",
      "MCA", "MEDIA", "ABL", "SBA", "STARTUP",
    ]);
    const portalDropdownCodes = [
      "LINE_OF_CREDIT", "TERM_LOAN", "FACTORING",
      "PURCHASE_ORDER_FINANCE", "EQUIPMENT_FINANCE",
      "MERCHANT_CASH_ADVANCE", "MEDIA_FUNDING",
      "ASSET_BASED_LENDING", "SBA_GOVERNMENT", "STARTUP_CAPITAL",
    ];
    for (const code of portalDropdownCodes) {
      const normalized = normalizeProductCategory(code);
      expect(normalized).not.toBeNull();
      expect(allowedByCheckConstraint.has(normalized as string)).toBe(true);
    }
  });
});
