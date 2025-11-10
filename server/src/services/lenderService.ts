import crypto from "node:crypto";
import {
  createLenderProductSchema,
  lenderProductSchema
} from "../schemas/lenderProduct.schema.js";
import type {
  CreateLenderProductInput,
  LenderProduct
} from "../schemas/lenderProduct.schema.js";
import { LenderSchema } from "../schemas/lenderSchema.js";
import type { LenderSchemaType } from "../schemas/lenderSchema.js";
import { applicationSummarySchema } from "../schemas/application.schema.js";
import { documentRequirementSchema } from "../schemas/document.schema.js";
import type { DocumentRequirement } from "../schemas/document.schema.js";

export interface SendToLenderInput {
  applicationId: string;
  lenderId: string;
  notes?: string;
}

export interface LenderReportFilters {
  lenderId?: string;
  startDate?: string;
  endDate?: string;
}

export interface LenderReportSummary {
  lenderId: string;
  totalApplications: number;
  approvedApplications: number;
  averageFunding: number;
}

/**
 * Service encapsulating operations performed with lender integrations.
 */
export class LenderService {
  private readonly lenders: LenderSchemaType[] = [
    LenderSchema.parse({
      id: crypto.randomUUID(),
      name: "Alpha Capital",
      contactEmail: "support@alphacapital.test",
      contactPhone: "+15551234567",
      rating: 4.6,
      active: true
    }),
    LenderSchema.parse({
      id: crypto.randomUUID(),
      name: "Bridge Funding Partners",
      contactEmail: "hello@bridgefunding.test",
      contactPhone: "+15559871234",
      rating: 4.2,
      active: true
    }),
    LenderSchema.parse({
      id: crypto.randomUUID(),
      name: "Summit Financial",
      contactEmail: "team@summitfinancial.test",
      contactPhone: "+15557654321",
      rating: 3.9,
      active: false
    })
  ];

  /**
   * Simulates sending an application to a specific lender.
   */
  async sendApplicationToLender(payload: SendToLenderInput): Promise<{ status: string; referenceId: string }> {
    const application = applicationSummarySchema.parse({
      id: payload.applicationId,
      applicant: {
        id: crypto.randomUUID(),
        firstName: "Integration",
        lastName: "Applicant",
        email: "integration@example.com",
        phone: "+12223334444"
      },
      loanDetails: {
        amountRequested: 20000,
        termMonths: 24,
        purpose: payload.notes ?? "N/A",
        collateral: undefined
      },
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      status: "queued",
      referenceId: `${payload.lenderId}-${application.id}`
    };
  }

  /**
   * Returns the set of lenders known to the platform.
   */
  async listLenders(): Promise<LenderSchemaType[]> {
    return this.lenders.map((lender) => ({ ...lender }));
  }

  /**
   * Generates an aggregate report for a lender.
   */
  async generateLenderReport(filters: LenderReportFilters): Promise<LenderReportSummary> {
    const totalApplications = filters.lenderId ? 42 : 128;
    return {
      lenderId: filters.lenderId ?? "ALL",
      totalApplications,
      approvedApplications: Math.round(totalApplications * 0.6),
      averageFunding: 25000
    };
  }

  /**
   * Lists lender products currently available.
   */
  async listProducts(): Promise<LenderProduct[]> {
    return [
      lenderProductSchema.parse({
        id: crypto.randomUUID(),
        lenderId: crypto.randomUUID(),
        name: "Standard Term Loan",
        interestRate: 0.079,
        termMonths: 36,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["term", "sme"]
      })
    ];
  }

  /**
   * Creates a new lender product definition.
   */
  async createProduct(payload: CreateLenderProductInput): Promise<LenderProduct> {
    const validated = createLenderProductSchema.parse(payload);
    return lenderProductSchema.parse({
      id: crypto.randomUUID(),
      lenderId: validated.lenderId,
      name: validated.name,
      interestRate: validated.interestRate,
      termMonths: validated.termMonths,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: validated.tags ?? []
    });
  }

  /**
   * Retrieves document requirements that a lender needs for an application.
   */
  async getDocumentRequirements(lenderId: string): Promise<DocumentRequirement[]> {
    return [
      documentRequirementSchema.parse({
        id: crypto.randomUUID(),
        name: "Lender specific financial statement",
        description: `Financial statement required by lender ${lenderId}`,
        required: true,
        status: "pending"
      })
    ];
  }
}

export const lenderService = new LenderService();
