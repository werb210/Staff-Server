import { randomUUID } from "crypto";
import {
  type Application,
  type ApplicationCreateInput,
  type ApplicationPublic,
  type ApplicationStatus,
  type ApplicationUpdateInput,
} from "../schemas/application.schema.js";
import { type PipelineStage } from "../schemas/pipeline.schema.js";
import { aiService, type AiServiceType } from "./aiService.js";

export interface ApplicationServiceOptions {
  ai?: AiServiceType;
  seedApplications?: Application[];
}

/**
 * ApplicationService stores applications in memory to simulate a database.
 */
export class ApplicationService {
  private readonly applications = new Map<string, Application>();
  private readonly ai: AiServiceType;

  constructor(options: ApplicationServiceOptions = {}) {
    this.ai = options.ai ?? aiService;
    const now = new Date();
    const seed: Application[] =
      options.seedApplications ?? this.createDefaultSeed(now);

    seed.forEach((application) =>
      this.applications.set(application.id, application),
    );
  }

  private createDefaultSeed(now: Date): Application[] {
    return [
      {
        id: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
        applicantName: "Jane Doe",
        applicantEmail: "jane.doe@example.com",
        applicantPhone: "+15551234567",
        productId: "0d1bd95e-08b5-46b3-8df8-17f29cc3fc49",
        loanAmount: 250000,
        loanPurpose: "Purchase new equipment",
        status: "review",
        score: 78,
        assignedTo: "alex.martin",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submittedAt: now.toISOString(),
      },
      {
        id: "8c0ca80e-efb6-4b8f-92dd-18de78274b3d",
        applicantName: "Michael Smith",
        applicantEmail: "michael.smith@example.com",
        applicantPhone: "+15559871234",
        productId: "4a67f0d4-571e-4be7-9a3a-5a846e91ec3c",
        loanAmount: 750000,
        loanPurpose: "Expand warehouse",
        status: "submitted",
        score: 65,
        assignedTo: "olivia.lee",
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: now.toISOString(),
        submittedAt: now.toISOString(),
      },
      {
        id: "9cf47b18-e789-4c58-9d22-b79c15b0c52e",
        applicantName: "Ava Patel",
        applicantEmail: "ava.patel@example.com",
        applicantPhone: "+15553451234",
        productId: "385ca198-5b56-4587-a5b4-947ca9b61930",
        loanAmount: 120000,
        loanPurpose: "Working capital",
        status: "approved",
        score: 88,
        assignedTo: "kai.wilson",
        createdAt: new Date(now.getTime() - 172800000).toISOString(),
        updatedAt: now.toISOString(),
        submittedAt: new Date(now.getTime() - 86400000).toISOString(),
        completedAt: now.toISOString(),
      },
    ];
  }

  /**
   * Returns all applications.
   */
  public listApplications(): Application[] {
    return Array.from(this.applications.values());
  }

  /**
   * Returns public-facing application summaries.
   */
  public listPublicApplications(): ApplicationPublic[] {
    return this.listApplications().map((application) => ({
      id: application.id,
      applicantName: application.applicantName,
      loanAmount: application.loanAmount,
      loanPurpose: application.loanPurpose,
      status: application.status,
      score: application.score,
      submittedAt: application.submittedAt,
      summary: this.ai.summarizeApplication(application),
    }));
  }

  /**
   * Fetches an application by identifier or returns a placeholder entry.
   */
  public getApplication(id: string): Application {
    const existing = this.applications.get(id);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const placeholder: Application = {
      id,
      applicantName: "Unknown Applicant",
      applicantEmail: "unknown@example.com",
      productId: "00000000-0000-0000-0000-000000000000",
      loanAmount: 0,
      loanPurpose: "Pending",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    this.applications.set(id, placeholder);
    return placeholder;
  }

  /**
   * Creates a new application from the supplied payload.
   */
  public createApplication(payload: ApplicationCreateInput): Application {
    const now = new Date().toISOString();
    const id = randomUUID();
    const application: Application = {
      id,
      applicantName: payload.applicantName,
      applicantEmail: payload.applicantEmail,
      applicantPhone: payload.applicantPhone,
      productId: payload.productId,
      loanAmount: payload.loanAmount,
      loanPurpose: payload.loanPurpose,
      status: payload.status ?? "draft",
      score: payload.score,
      assignedTo: payload.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    this.applications.set(id, application);
    return application;
  }

  /**
   * Updates arbitrary fields on an application.
   */
  public updateApplication(
    id: string,
    updates: Omit<ApplicationUpdateInput, "id">,
  ): Application {
    const existing = this.getApplication(id);
    const updated: Application = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  /**
   * Updates an application's status.
   */
  public updateStatus(id: string, status: ApplicationStatus): Application {
    return this.updateApplication(id, { status });
  }

  /**
   * Assigns an application to a team member and optionally moves the stage.
   */
  public assignApplication(
    id: string,
    assignedTo: string,
    stage?: ApplicationStatus,
  ): Application {
    const updates: Partial<Application> = {
      assignedTo,
    };
    if (stage) {
      updates.status = stage;
    }
    return this.updateApplication(id, updates);
  }

  /**
   * Removes an application from the in-memory store.
   */
  public deleteApplication(id: string): Application {
    const existing = this.getApplication(id);
    this.applications.delete(id);
    return existing;
  }

  /**
   * Marks an application as submitted by changing its status.
   */
  public submitApplication(id: string, submittedBy: string): Application {
    const application = this.updateStatus(id, "submitted");
    return {
      ...application,
      submittedBy,
      submittedAt: new Date().toISOString(),
    };
  }

  /**
   * Marks an application as completed.
   */
  public completeApplication(id: string, completedBy: string): Application {
    const application = this.updateStatus(id, "completed");
    return {
      ...application,
      completedBy,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Publishes an application to the public list.
   */
  public publishApplication(id: string, publishedBy: string): ApplicationPublic {
    const application = this.updateStatus(id, "approved");
    const summary = this.ai.summarizeApplication(application);
    return {
      id: application.id,
      applicantName: application.applicantName,
      loanAmount: application.loanAmount,
      loanPurpose: application.loanPurpose,
      status: application.status,
      score: application.score,
      submittedAt: application.submittedAt,
      summary: `${summary} (published by ${publishedBy})`,
    };
  }

  /**
   * Builds a pipeline summary based on the applications in memory.
   */
  public buildPipeline(): PipelineStage[] {
    const grouped = new Map<ApplicationStatus, Application[]>();
    for (const application of this.applications.values()) {
      const list = grouped.get(application.status) ?? [];
      list.push(application);
      grouped.set(application.status, list);
    }

    const statusOrder: ApplicationStatus[] = [
      "draft",
      "submitted",
      "review",
      "approved",
      "completed",
    ];

    return statusOrder
      .filter((status) => grouped.has(status))
      .map((status, index) => {
        const apps = grouped.get(status) ?? [];
        const totalLoanAmount = apps.reduce(
          (sum, app) => sum + (app.loanAmount ?? 0),
          0,
        );
        const averageScore =
          apps.length > 0
            ? apps.reduce((sum, app) => sum + (app.score ?? 0), 0) /
              apps.length
            : undefined;
        const sortedApplications = [...apps].sort((a, b) =>
          (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
        );
        return {
          id: randomUUID(),
          name: status,
          status,
          position: index,
          count: apps.length,
          totalLoanAmount,
          averageScore,
          lastUpdatedAt: new Date().toISOString(),
          applications: sortedApplications,
        };
      });
  }
}

export const applicationService = new ApplicationService();

export type ApplicationServiceType = ApplicationService;

export const createApplicationService = (
  options: ApplicationServiceOptions = {},
): ApplicationService => new ApplicationService(options);
