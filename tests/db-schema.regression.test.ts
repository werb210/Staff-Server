import { lenderColumns, lenderProductColumns } from "../src/db/schema";

describe("database schema regression", () => {
  it("exposes required lender columns", () => {
    expect(lenderColumns.includes("id")).toBe(true);
    expect(lenderColumns.includes("name")).toBe(true);
    expect(lenderColumns.includes("active")).toBe(true);
  });

  it("exposes required lender product columns", () => {
    expect(lenderProductColumns.includes("id")).toBe(true);
    expect(lenderProductColumns.includes("name")).toBe(true);
    expect(lenderProductColumns.includes("productType")).toBe(true);
    expect(lenderProductColumns.includes("minAmount")).toBe(true);
    expect(lenderProductColumns.includes("maxAmount")).toBe(true);
    expect(lenderProductColumns.includes("minCreditScore")).toBe(true);
    expect(lenderProductColumns.includes("interestRate")).toBe(true);
    expect(lenderProductColumns.includes("termMonths")).toBe(true);
    expect(lenderProductColumns.includes("active")).toBe(true);
  });
});
