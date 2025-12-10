import { LenderProductEngine } from "../../lenderProductEngine/lenderProductEngine";

describe("LenderProductEngine", () => {
  const stubProvider = {
    async fetchProducts() {
      return [
        { id: "p1", lenderName: "A", productName: "Line", productType: "line", minAmount: "1000", maxAmount: "5000", isActive: true, active: true, productCategory: "working_capital", createdAt: new Date(), updatedAt: new Date() },
        { id: "p2", lenderName: "B", productName: "Term", productType: "term", minAmount: "5000", maxAmount: "10000", isActive: true, active: true, productCategory: "term_loan", createdAt: new Date(), updatedAt: new Date() },
      ] as any;
    },
    async fetchRequiredDocuments() {
      return [
        { id: "d1", lenderProductId: "p1", docCategory: "bank_statements", required: true, createdAt: new Date(), updatedAt: new Date(), validationRules: {}, displayOrder: 0 },
        { id: "d2", lenderProductId: "p2", docCategory: "bank_statements", required: false, createdAt: new Date(), updatedAt: new Date(), validationRules: {}, displayOrder: 0 },
      ];
    },
    async fetchDynamicQuestions() {
      return [
        {
          id: "q1",
          lenderProductId: "p1",
          label: "What is revenue?",
          type: "number",
          options: [],
          orderIndex: 1,
          required: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    },
  };

  it("merges requirements across products", async () => {
    const engine = new LenderProductEngine(stubProvider as any);
    const result = await engine.evaluate({ requestedAmount: 2000 });

    expect(result.matchedProducts).toHaveLength(1);
    expect(result.requiredDocuments).toHaveLength(1);
    expect(result.dynamicQuestions[0].label).toContain("revenue");
  });
});
