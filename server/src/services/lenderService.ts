import { randomUUID } from "node:crypto";
import {
  createLenderProductSchema,
  lenderProductSchema,
  type CreateLenderProductInput,
  type LenderProduct
} from "../schemas/lenderProduct.schema.js";
import { logInfo } from "../utils/logger.js";

interface LenderRecord {
  id: string;
  name: string;
  products: LenderProduct[];
}

/**
 * Stubbed lender service with in-memory data used by multiple routes.
 */
class LenderService {
  private lenders: LenderRecord[] = [
    {
      id: randomUUID(),
      name: "Example Lender",
      products: [
        lenderProductSchema.parse({
          id: randomUUID(),
          lenderId: randomUUID(),
          name: "Working Capital Loan",
          interestRate: 7.5,
          termMonths: 24
        })
      ]
    }
  ];

  listLenders(): LenderRecord[] {
    logInfo("lenderService.listLenders invoked");
    return [...this.lenders];
  }

  async listProducts(): Promise<LenderProduct[]> {
    logInfo("lenderService.listProducts invoked");
    return this.lenders.flatMap((lender) => lender.products);
  }

  async createProduct(payload: CreateLenderProductInput): Promise<LenderProduct> {
    logInfo("lenderService.createProduct invoked");
    const validated = createLenderProductSchema.parse(payload);
    const product = lenderProductSchema.parse({
      ...validated,
      id: randomUUID()
    });
    const lender = this.lenders.find((entry) => entry.id === validated.lenderId) ?? this.lenders[0];
    lender.products.push(product);
    return product;
  }

  async getDocumentRequirements(_lenderId: string): Promise<Array<{ id: string; name: string }>> {
    logInfo("lenderService.getDocumentRequirements invoked");
    return [
      { id: "req-1", name: "Last two years financial statements" }
    ];
  }

  sendToLender(applicationId: string, lenderId: string): { message: string } {
    logInfo("lenderService.sendToLender invoked");
    return {
      message: `Application ${applicationId} sent to lender ${lenderId}`
    };
  }

  generateReport(): { generatedAt: string; totalLenders: number } {
    logInfo("lenderService.generateReport invoked");
    return {
      generatedAt: new Date().toISOString(),
      totalLenders: this.lenders.length
    };
  }
}

export const lenderService = new LenderService();
