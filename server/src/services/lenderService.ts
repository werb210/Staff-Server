import { randomUUID } from "crypto";
import {
  type Lender,
  type LenderDocumentRequirement,
  type LenderProduct,
  type LenderReport,
} from "../schemas/lenderProduct.schema.js";
import { applicationService } from "./applicationService.js";
import { aiService } from "./aiService.js";

/**
 * LenderService provides an in-memory catalogue of lenders and products.
 */
class LenderService {
  private readonly lenders: Lender[] = [
    {
      id: "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
      name: "Northwind Credit",
      contactEmail: "sales@northwind.example",
      contactPhone: "+1-555-123-1000",
      status: "active",
      rating: 4.5,
    },
    {
      id: "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c",
      name: "Evergreen Bank",
      contactEmail: "partners@evergreen.example",
      contactPhone: "+1-555-555-6543",
      status: "onboarding",
      rating: 4.2,
    },
    {
      id: "f3b2077d-3a4f-4e75-8d0e-41f4e5cc0d84",
      name: "Boreal Capital",
      contactEmail: "alliances@boreal.example",
      contactPhone: "+1-555-450-7788",
      status: "active",
      rating: 4.8,
    },
  ];

  private readonly requirements = new Map<string, LenderDocumentRequirement[]>([
    [
      "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
      [
        {
          documentType: "bank-statement",
          required: true,
          description: "Last 3 months of business bank statements",
        },
        {
          documentType: "tax-return",
          required: true,
          description: "Most recent federal tax return",
        },
      ],
    ],
    [
      "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c",
      [
        {
          documentType: "rent-roll",
          required: false,
          description: "Rent roll for the subject property",
        },
      ],
    ],
  ]);

  private readonly products: LenderProduct[] = [
    {
      id: "385ca198-5b56-4587-a5b4-947ca9b61930",
      lenderId: "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
      name: "Small Business Term Loan",
      interestRate: 6.25,
      minAmount: 50000,
      maxAmount: 500000,
      termMonths: 60,
      documentation: this.requirements.get(
        "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
      ) ?? [],
      recommendedScore: 70,
    },
    {
      id: "9ce2637f-2255-4790-8eb7-50f572cca40a",
      lenderId: "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c",
      name: "Commercial Mortgage",
      interestRate: 7.1,
      minAmount: 250000,
      maxAmount: 2000000,
      termMonths: 240,
      documentation: this.requirements.get("4a67f0d4-571e-4be7-9a3a-5a846e91ec3c") ?? [],
      recommendedScore: 80,
    },
    {
      id: "a9a7b7dc-4a9f-4f42-872b-b723f47876eb",
      lenderId: "f3b2077d-3a4f-4e75-8d0e-41f4e5cc0d84",
      name: "Line of Credit",
      interestRate: 5.6,
      minAmount: 25000,
      maxAmount: 300000,
      termMonths: 36,
      documentation: [
        {
          documentType: "financial-statements",
          required: true,
          description: "YTD financial statements",
        },
      ],
      recommendedScore: 65,
    },
  ];

  /**
   * Returns the list of configured lenders.
   */
  public listLenders(): Lender[] {
    return [...this.lenders];
  }

  /**
   * Returns the products for a lender. When lenderId is omitted all products are returned.
   */
  public listProducts(lenderId?: string): LenderProduct[] {
    const products = [...this.products];
    return lenderId ? products.filter((product) => product.lenderId === lenderId) : products;
  }

  /**
   * Returns the documentation requirements for the given lender.
   */
  public getDocumentRequirements(lenderId: string): LenderDocumentRequirement[] {
    return [...(this.requirements.get(lenderId) ?? [])];
  }

  /**
   * Simulates sending an application package to a lender.
   */
  public sendToLender(
    applicationId: string,
    lenderId: string,
  ): LenderReport & { aiScore: number; aiExplanation: string } {
    const application = applicationService.getApplication(applicationId);
    const product = this.listProducts(lenderId)[0];
    const { score, explanation } = product
      ? aiService.scoreLenderMatch(product, application)
      : { score: 50, explanation: "Manual review required" };

    return {
      id: randomUUID(),
      lenderId,
      status: "queued",
      generatedAt: new Date().toISOString(),
      totalApplications: 1,
      avgDecisionTimeHours: 48,
      topProducts: product ? [{ id: product.id, name: product.name }] : [],
      aiScore: score,
      aiExplanation: explanation,
    };
  }

  /**
   * Produces a synthetic report summarising lender product counts.
   */
  public generateReports(): LenderReport[] {
    return this.lenders.map((lender) => ({
      id: randomUUID(),
      lenderId: lender.id,
      status: "summary",
      generatedAt: new Date().toISOString(),
      totalApplications: Math.floor(Math.random() * 12) + 3,
      avgDecisionTimeHours: Math.floor(Math.random() * 48) + 24,
      topProducts: this.listProducts(lender.id).map((product) => ({
        id: product.id,
        name: product.name,
      })),
    }));
  }
}

export const lenderService = new LenderService();

export type LenderServiceType = LenderService;
