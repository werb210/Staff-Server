import { lenderService } from "../services/lenderService.js";

describe("lenderService", () => {
  it("provides lenders and products", () => {
    const lenders = lenderService.listLenders();
    expect(lenders.length).toBeGreaterThan(0);

    const products = lenderService.listProducts(lenders[0].id);
    expect(products.length).toBeGreaterThan(0);
  });

  it("returns AI scoring when sending to lender", () => {
    const lenders = lenderService.listLenders();
    const [first] = lenders;
    const response = lenderService.sendToLender(
      "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
      first.id,
    );

    expect(response.aiScore).toBeGreaterThan(0);
    expect(response.topProducts.length).toBeGreaterThanOrEqual(0);
  });
});
