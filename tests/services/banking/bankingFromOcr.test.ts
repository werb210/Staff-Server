import { describe, it, expect } from "vitest";
import {
  buildBankingFromOcr,
  adaptToLegacyRow,
  adaptAllToLegacyRows,
} from "../../../src/services/banking/bankingFromOcr";

describe("buildBankingFromOcr", () => {
  it("returns empty results for empty input", () => {
    const out = buildBankingFromOcr({});
    expect(out.transactions).toEqual([]);
  });

  it("extracts rows from a Date/Description/Amount table", () => {
    const out = buildBankingFromOcr({
      pages: [
        {
          tables: [
            {
              rows: [
                [{ text: "Date" }, { text: "Description" }, { text: "Amount" }, { text: "Balance" }],
                [{ text: "01/15/2026" }, { text: "Coffee Shop" }, { text: "-12.50" }, { text: "1,000.00" }],
                [{ text: "01/16/2026" }, { text: "Deposit" }, { text: "500.00" }, { text: "1,500.00" }],
              ],
            },
          ],
        },
      ],
    });
    expect(out.transactions).toHaveLength(2);
    expect(out.transactions[0]).toMatchObject({
      date: "2026-01-15",
      description: "Coffee Shop",
      amount: -12.5,
      balance: 1000,
    });
    expect(out.transactions[1]?.amount).toBe(500);
  });

  it("splits amounts for legacy row", () => {
    const positive = adaptToLegacyRow({ date: "2026-01-01", description: "x", amount: 50 });
    expect(positive.credit).toBe(50);
    expect(positive.type).toBe("credit");

    const negative = adaptToLegacyRow({ date: "2026-01-01", description: "x", amount: -25.5 });
    expect(negative.debit).toBe(25.5);
    expect(negative.type).toBe("debit");
  });

  it("never produces null fields", () => {
    const rows = adaptAllToLegacyRows([
      { date: "2026-01-01", description: "a", amount: 10, balance: 100 },
      { date: null, description: null },
    ]);
    for (const r of rows) {
      for (const v of Object.values(r)) expect(v).not.toBeNull();
    }
  });
});
