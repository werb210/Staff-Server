import { randomUUID } from "node:crypto";
import {
  applicationSummarySchema,
  createApplicationSchema,
  type ApplicationSummary,
  type CompleteApplicationInput,
  type CreateApplicationInput,
  type PublicApplication,
  type SubmitApplicationInput,
  completeApplicationSchema,
  publicApplicationSchema,
  submitApplicationSchema
} from "../schemas/application.schema.js";

/**
 * Simple in-memory store for application records used by the stub routes.
 */
class ApplicationService {
  private applications: ApplicationSummary[] = [];

  /**
   * Returns the list of stubbed applications.
   */
  listApplications(): ApplicationSummary[] {
    return [...this.applications];
  }

  /**
   * Persists a new application in memory and returns a normalized summary.
   */
  createApplication(payload: CreateApplicationInput): ApplicationSummary {
    const validated = createApplicationSchema.parse(payload);
    const timestamp = new Date().toISOString();
    const summary = applicationSummarySchema.parse({
      id: randomUUID(),
      applicant: validated.applicant,
      loanDetails: validated.loanDetails,
      status: "submitted",
      createdAt: timestamp,
      updatedAt: timestamp
    });

    this.applications.push(summary);
    return summary;
  }

  /**
   * Alias used by modular routes to create a draft application.
   */
  async createDraftApplication(payload: CreateApplicationInput): Promise<ApplicationSummary> {
    const draft = this.createApplication(payload);
    return { ...draft, status: "draft" };
  }

  /**
   * Stubbed submit handler mirroring the original service contract.
   */
  async submitApplication(payload: SubmitApplicationInput): Promise<ApplicationSummary> {
    const validated = submitApplicationSchema.parse(payload);
    const now = new Date().toISOString();
    return applicationSummarySchema.parse({
      id: validated.applicationId,
      applicant: {
        id: validated.submittedBy,
        firstName: "Submitted",
        lastName: "User",
        email: "submitted@example.com",
        phone: "+15550000000"
      },
      loanDetails: {
        amountRequested: 10000,
        termMonths: 12,
        purpose: validated.additionalNotes ?? "Submitted application",
        collateral: undefined
      },
      status: "submitted",
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * Stubbed completion handler for compatibility with existing routes.
   */
  async markApplicationComplete(payload: CompleteApplicationInput): Promise<ApplicationSummary> {
    const validated = completeApplicationSchema.parse(payload);
    const now = new Date().toISOString();
    return applicationSummarySchema.parse({
      id: validated.applicationId,
      applicant: {
        id: validated.completedBy,
        firstName: "Completed",
        lastName: "User",
        email: "completed@example.com",
        phone: "+15550000000"
      },
      loanDetails: {
        amountRequested: 15000,
        termMonths: 24,
        purpose: validated.completionNotes ?? "Completed application",
        collateral: undefined
      },
      status: "completed",
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * Returns a small set of public applications for marketing pages.
   */
  async listPublicApplications(): Promise<PublicApplication[]> {
    return [
      publicApplicationSchema.parse({
        id: randomUUID(),
        loanDetails: {
          amountRequested: 20000,
          termMonths: 18,
          purpose: "Equipment financing",
          collateral: undefined
        },
        status: "submitted",
        createdAt: new Date().toISOString()
      })
    ];
  }
}

export const applicationService = new ApplicationService();
