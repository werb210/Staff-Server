import { randomUUID } from "crypto";
import {
  type Lender,
  type LenderCreateInput,
  type LenderDocumentRequirement,
  type LenderProduct,
  type LenderProductCreateInput,
  type LenderProductUpdateInput,
  type LenderReport,
  type LenderUpdateInput,
} from "../schemas/lenderProduct.schema.js";
import {
  ApplicationService,
  type ApplicationServiceType,
} from "./applicationService.js";
import { aiService, type AiServiceType } from "./aiService.js";

export interface LenderServiceOptions {
  applicationService?: ApplicationServiceType;
  ai?: AiServiceType;
  seedLenders?: Lender[];
  seedProducts?: LenderProduct[];
  seedRequirements?: Record<string, LenderDocumentRequirement[]>;
}

/**
 * LenderService provides an in-memory catalogue of lenders and products.
 */
export class LenderService {
  private lenders: Lender[] = [];
  private products: LenderProduct[] = [];
  private readonly requirements = new Map<string, LenderDocumentRequirement[]>();
  private readonly applications: ApplicationServiceType;
  private readonly ai: AiServiceType;

  constructor(options: LenderServiceOptions = {}) {
    this.applications = options.applicationService ?? new ApplicationService();
    this.ai = options.ai ?? aiService;

    const baseRequirements =
      options.seedRequirements ??
      this.buildDefaultRequirements(["a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f", "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c"]);
    for (const [lenderId, requirements] of Object.entries(baseRequirements)) {
      this.requirements.set(lenderId, [...requirements]);
    }

    this.lenders =
      options.seedLenders ?? this.buildDefaultLenders(Array.from(this.requirements.keys()));
    this.products =
      options.seedProducts ?? this.buildDefaultProducts(this.requirements);
  }

  private buildDefaultRequirements(ids: string[]): Record<string, LenderDocumentRequirement[]> {
    return {
      [ids[0]]: [
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
      [ids[1]]: [
        {
          documentType: "rent-roll",
          required: false,
          description: "Rent roll for the subject property",
        },
      ],
    };
  }

  private buildDefaultLenders(ids: string[]): Lender[] {
    return [
      {
        id: ids[0],
        name: "Northwind Credit",
        contactEmail: "sales@northwind.example",
        contactPhone: "+1-555-123-1000",
        status: "active",
        rating: 4.5,
      },
      {
        id: ids[1],
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
  }

  private buildDefaultProducts(
    requirements: Map<string, LenderDocumentRequirement[]>,
  ): LenderProduct[] {
    return [
      {
        id: "385ca198-5b56-4587-a5b4-947ca9b61930",
        lenderId: "a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f",
        name: "Small Business Term Loan",
        interestRate: 6.25,
        minAmount: 50000,
        maxAmount: 500000,
        termMonths: 60,
        documentation: requirements.get("a0e2711b-4bb5-4ba0-94f5-cc5f25152f1f") ?? [],
        recommendedScore: 70,
        active: true,
      },
      {
        id: "9ce2637f-2255-4790-8eb7-50f572cca40a",
        lenderId: "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c",
        name: "Commercial Mortgage",
        interestRate: 7.1,
        minAmount: 250000,
        maxAmount: 2000000,
        termMonths: 240,
        documentation: requirements.get("4a67f0d4-571e-4be7-9a3a-5a846e91ec3c") ?? [],
        recommendedScore: 80,
        active: true,
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
        active: true,
      },
    ];
  }

  /**
   * Returns the list of configured lenders.
   */
  public listLenders(): Lender[] {
    return this.lenders.map((lender) => ({ ...lender }));
  }

  /**
   * Returns the products for a lender. When lenderId is omitted all products are returned.
   */
  public listProducts(lenderId?: string): LenderProduct[] {
    const products = this.products.map((product) => ({ ...product }));
    return lenderId
      ? products.filter((product) => product.lenderId === lenderId)
      : products;
  }

  /**
   * Fetches a single lender by identifier.
   */
  public getLender(id: string): Lender {
    const lender = this.lenders.find((item) => item.id === id);
    if (!lender) {
      throw new Error("Lender not found");
    }
    return { ...lender };
  }

  /**
   * Creates a new lender record.
   */
  public createLender(input: LenderCreateInput): Lender {
    const lender: Lender = {
      id: randomUUID(),
      name: input.name,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      status: input.status ?? "active",
      rating: input.rating ?? 4,
    };
    this.lenders = [lender, ...this.lenders];
    return lender;
  }

  /**
   * Updates an existing lender.
   */
  public updateLender(id: string, updates: Omit<LenderUpdateInput, "id">): Lender {
    const index = this.lenders.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Lender not found");
    }
    const updated: Lender = {
      ...this.lenders[index],
      ...updates,
    };
    this.lenders[index] = updated;
    return updated;
  }

  /**
   * Removes a lender and any associated products.
   */
  public deleteLender(id: string): void {
    const exists = this.lenders.some((item) => item.id === id);
    if (!exists) {
      throw new Error("Lender not found");
    }
    this.lenders = this.lenders.filter((item) => item.id !== id);
    this.products = this.products.filter((product) => product.lenderId !== id);
    this.requirements.delete(id);
  }

  /**
   * Creates a product for a lender.
   */
  public createProduct(input: LenderProductCreateInput): LenderProduct {
    this.getLender(input.lenderId);
    const documentation =
      input.documentation ?? this.requirements.get(input.lenderId) ?? [];
    const product: LenderProduct = {
      id: randomUUID(),
      lenderId: input.lenderId,
      name: input.name,
      interestRate: input.interestRate,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      termMonths: input.termMonths,
      documentation,
      recommendedScore: input.recommendedScore,
      active: input.active ?? true,
    };
    this.products = [product, ...this.products];
    return product;
  }

  /**
   * Updates a lender product.
   */
  public updateProduct(id: string, updates: Omit<LenderProductUpdateInput, "id">): LenderProduct {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) {
      throw new Error("Product not found");
    }
    if (updates.lenderId) {
      this.getLender(updates.lenderId);
    }
    const updated: LenderProduct = {
      ...this.products[index],
      ...updates,
    };
    this.products[index] = updated;
    return updated;
  }

  /**
   * Deletes a product.
   */
  public deleteProduct(id: string): void {
    const exists = this.products.some((product) => product.id === id);
    if (!exists) {
      throw new Error("Product not found");
    }
    this.products = this.products.filter((product) => product.id !== id);
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
    const application = this.applications.getApplication(applicationId);
    const product = this.listProducts(lenderId)[0];
    const { score, explanation } = product
      ? this.ai.scoreLenderMatch(product, application)
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

export const createLenderService = (
  options: LenderServiceOptions = {},
): LenderService => new LenderService(options);
