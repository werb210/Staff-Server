import { LenderProductEngine } from "../../lenderProductEngine/lenderProductEngine";

describe("LenderProductEngine", () => {
  const stubProvider = {
    async fetchProducts() {
      return [
        { id: "p1", lenderName: "A", productName: "Line", productType: "line", minAmount: "1000", maxAmount: "5000", isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: "p2", lenderName: "B", productName: "Term", productType: "term", minAmount: "5000", maxAmount: "10000", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ] as any;
    },
    async fetchRequiredDocuments() {
      return [
        { id: "d1", lenderProductId: "p1", title: "Bank Statements", description: null, category: "financial", isMandatory: true, createdAt: new Date(), updatedAt: new Date(), validationRules: {}, displayOrder: 0 },
        { id: "d1", lenderProductId: "p2", title: "Bank Statements", description: null, category: "financial", isMandatory: true, createdAt: new Date(), updatedAt: new Date(), validationRules: {}, displayOrder: 0 },
      ];
    },
    async fetchDynamicQuestions() {
      return [
        {
          id: "q1",
          lenderProductId: "p1",
          appliesTo: "business",
          prompt: "What is revenue?",
          fieldType: "number",
          options: [],
          displayOrder: 1,
          isRequired: true,
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
    expect(result.requiredQuestionsBusiness[0].prompt).toContain("revenue");
  });
});
