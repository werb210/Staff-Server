import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("migration 135 — lender_products category full union", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "migrations",
      "135_lender_products_category_full_union.sql",
    ),
    "utf8",
  );

  const expectedCategories = [
    "LOC",
    "TERM",
    "FACTORING",
    "PO",
    "EQUIPMENT",
    "MCA",
    "MEDIA",
    "LINE_OF_CREDIT",
    "TERM_LOAN",
    "INVOICE_FACTORING",
    "PURCHASE_ORDER_FINANCE",
    "EQUIPMENT_FINANCE",
    "STARTUP_CAPITAL",
    "MERCHANT_CASH_ADVANCE",
    "ASSET_BASED_LENDING",
    "SBA_GOVERNMENT",
  ];

  it.each(expectedCategories)("includes %s", (value) => {
    expect(sql).toContain(`'${value}'`);
  });

  it("uses idempotent DROP CONSTRAINT IF EXISTS pattern", () => {
    expect(sql).toMatch(
      /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+lender_products_category_check/i,
    );
  });

  it("re-adds the constraint with the canonical name", () => {
    expect(sql).toMatch(
      /ADD\s+CONSTRAINT\s+lender_products_category_check\s+CHECK/i,
    );
  });
});
