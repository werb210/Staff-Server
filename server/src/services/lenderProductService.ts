import { randomUUID } from "node:crypto";
import { lenderProductSchema, parseLenderProduct, type LenderProduct } from "../schemas/lenderProduct.schema.js";

/**
 * Service exposing lender product catalogue information.
 */
class LenderProductService {
  private readonly products = new Map<string, LenderProduct>();

  constructor() {
    const seed: LenderProduct[] = [
      {
        id: randomUUID(),
        lenderId: randomUUID(),
        name: "Prime Working Capital",
        description: "Flexible working capital line with interest-only period.",
        interestRate: 5.5,
        maxAmount: 250000,
        termMonths: 36
      },
      {
        id: randomUUID(),
        lenderId: randomUUID(),
        name: "Equipment Lease Express",
        description: "Rapid approvals for equipment purchases up to $150k.",
        interestRate: 6.2,
        maxAmount: 150000,
        termMonths: 48
      }
    ];

    seed.forEach((product) => {
      const parsed = parseLenderProduct(product);
      this.products.set(parsed.id, parsed);
    });
  }

  listProducts(): LenderProduct[] {
    return Array.from(this.products.values()).map((product) => ({ ...product }));
  }

  addProduct(input: Omit<LenderProduct, "id">): LenderProduct {
    const validated = lenderProductSchema.omit({ id: true }).parse(input);
    const created: LenderProduct = { ...validated, id: randomUUID() };
    this.products.set(created.id, created);
    return { ...created };
  }
}

export const lenderProductService = new LenderProductService();
export type { LenderProduct } from "../schemas/lenderProduct.schema.js";
