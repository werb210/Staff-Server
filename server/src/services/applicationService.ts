import { randomUUID } from "crypto";
import {
  type Application,
  type ApplicationCreateInput,
  type ApplicationPublic,
  type ApplicationUpdateInput,
  type ApplicationStage,
} from "../schemas/application.schema.js";
import {
  type ClientPortalSession,
  ClientPortalSessionSchema,
} from "../schemas/publicLogin.schema.js";
import { aiService, type AiServiceType } from "./aiService.js";

export interface ApplicationServiceOptions {
  ai?: AiServiceType;
  seedApplications?: Application[];
}

export class ApplicationPortalNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No application found for ${identifier}`);
    this.name = "ApplicationPortalNotFoundError";
  }
}

export class ApplicationService {
  private readonly applications = new Map<string, Application>();
  private readonly ai: AiServiceType;

  constructor(options: ApplicationServiceOptions = {}) {
    this.ai = options.ai ?? aiService;
    const now = new Date();
    const seed: Application[] =
      options.seedApplications ?? this.defaultSeed(now);
    seed.forEach((app) => this.applications.set(app.id, app));
  }

  private defaultSeed(now: Date): Application[] {
    return [
      {
        id: "c27e0c87-3bd5-47cc-8d14-5c569ea2cc15",
        externalId: undefined,
        businessName: "Demo Manufacturing",
        applicantName: "Jane Doe",
        applicantEmail: "jane.doe@example.com",
        applicantPhone: "+15551234567",
        productId: "0d1bd95e-08b5-46b3-8df8-17f29cc3fc49",
        productCategory: "equipment",
        loanAmount: 250000,
        loanPurpose: "Purchase new equipment",
        stage: "in_review",
        status: "review",
        score: 78,
        matchScore: 82,
        assignedTo: "alex.martin",
        referrerId: undefined,
        silo: "BF",
        aiSummary: undefined,
        ocrExtracted: undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        submittedAt: now.toISOString(),
      },
    ];
  }

  public listApplications(): Application[] {
    return Array.from(this.applications.values());
  }

  private findById(id: string): Application | undefined {
    return this.applications.get(id);
  }

  private findByEmail(email: string): Application | undefined {
    const normalized = email.trim().toLowerCase();
    return this.listApplications().find(
      (app) => app.applicantEmail.toLowerCase() === normalized,
    );
  }

  public listPublicApplications(): ApplicationPublic[] {
    return this.listApplications().map((app) => ({
      id: app.id,
      businessName: app.businessName,
      loanAmount: app.loanAmount,
      loanPurpose: app.loanPurpose,
      stage: app.stage,
      score: app.score,
      matchScore: app.matchScore,
      submittedAt: app.submittedAt,
      summary: this.ai.summarizeApplication(app),
    }));
  }

  public getApplication(id: string): Application {
    const existing = this.findById(id);
    if (existing) return existing;

    const now = new Date().toISOString();
    const placeholder: Application = {
      id,
      externalId: undefined,
      businessName: "New Business",
      applicantName: "Unknown",
      applicantEmail: "unknown@example.com",
      productId: "00000000-0000-0000-0000-000000000000",
      productCategory: "general",
      loanAmount: 0,
      loanPurpose: "Pending",
      stage: "new",
      status: "draft",
      score: 0,
      matchScore: 0,
      assignedTo: undefined,
      referrerId: undefined,
      silo: "BF",
      aiSummary: undefined,
      ocrExtracted: undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.applications.set(id, placeholder);
    return placeholder;
  }

  public createApplication(payload: ApplicationCreateInput): Application {
    const now = new Date().toISOString();
    const id = randomUUID();

    const application: Application = {
      id,
      externalId: undefined,
      businessName: payload.businessName,
      applicantName: payload.applicantName,
      applicantEmail: payload.applicantEmail,
      applicantPhone: payload.applicantPhone,
      productId: payload.productId,
      productCategory: payload.productCategory,
      loanAmount: payload.loanAmount,
      loanPurpose: payload.loanPurpose,
      stage: payload.stage ?? "new",
      status: payload.status ?? "draft",
      score: 0,
      matchScore: 0,
      assignedTo: payload.assignedTo,
      referrerId: payload.referrerId,
      silo: payload.silo ?? "BF",
      aiSummary: undefined,
      ocrExtracted: undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.applications.set(id, application);
    return application;
  }

  public updateApplication(
    id: string,
    updates: Omit<ApplicationUpdateInput, "id">,
  ): Application {
    const current = this.getApplication(id);
    const updated: Application = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  public updateStage(id: string, stage: ApplicationStage): Application {
    return this.updateApplication(id, { stage });
  }

  public assignApplication(
    id: string,
    assignedTo: string,
    stage?: ApplicationStage,
  ): Application {
    const updates: Partial<Application> = { assignedTo };
    if (stage) updates.stage = stage;
    return this.updateApplication(id, updates);
  }

  public deleteApplication(id: string): Application {
    const existing = this.getApplication(id);
    this.applications.delete(id);
    return existing;
  }

  public submitApplication(id: string, submittedBy: string): Application {
    const now = new Date().toISOString();
    return this.updateApplication(id, {
      status: "submitted",
      stage: "in_review",
      submittedBy,
      submittedAt: now,
    });
  }

  public completeApplication(id: string, completedBy: string): Application {
    return this.updateApplication(id, {
      status: "completed",
      stage: "approved",
      completedBy,
      completedAt: new Date().toISOString(),
    });
  }

  public publishApplication(id: string, publishedBy: string): ApplicationPublic {
    const app = this.updateApplication(id, { status: "approved" });
    const summary = this.ai.summarizeApplication(app);

    return {
      id: app.id,
      businessName: app.businessName,
      loanAmount: app.loanAmount,
      loanPurpose: app.loanPurpose,
      stage: app.stage,
      score: app.score,
      matchScore: app.matchScore,
      submittedAt: app.submittedAt,
      summary: `${summary} (published by ${publishedBy})`,
    };
  }

  public buildPipeline() {
    const stages: ApplicationStage[] = [
      "new",
      "requires_docs",
      "in_review",
      "ready_for_lenders",
      "sent_to_lenders",
      "approved",
      "declined",
    ];

    return stages.map((stage, index) => {
      const apps = this.listApplications().filter((a) => a.stage === stage);

      return {
        id: randomUUID(),
        name: stage,
        stage,
        position: index,
        count: apps.length,
        totalLoanAmount: apps.reduce((sum, a) => sum + a.loanAmount, 0),
        averageScore:
          apps.length > 0
            ? apps.reduce((sum, a) => sum + (a.score ?? 0), 0) / apps.length
            : 0,
        lastUpdatedAt: new Date().toISOString(),
        applications: apps.sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      };
    });
  }

  private resolvePortalApplication(
    applicationId?: string,
    applicantEmail?: string,
  ): Application {
    if (applicationId) {
      const byId = this.findById(applicationId);
      if (byId) return byId;
    }
    if (applicantEmail) {
      const byEmail = this.findByEmail(applicantEmail);
      if (byEmail) return byEmail;
    }
    throw new ApplicationPortalNotFoundError(
      applicationId ?? applicantEmail ?? "unknown",
    );
  }

  private buildPortalSession(
    app: Application,
    silo: string,
  ): ClientPortalSession {
    const preferred = app.applicantName.split(" ")[0] || "there";

    return ClientPortalSessionSchema.parse({
      applicationId: app.id,
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      status: app.status,
      redirectUrl: `/portal/applications/${app.id}`,
      nextStep: this.nextStep(app.stage),
      updatedAt: new Date().toISOString(),
      silo,
      message: `Welcome back, ${preferred}!`,
    });
  }

  private nextStep(stage: ApplicationStage): string {
    switch (stage) {
      case "new":
        return "Start your application.";
      case "requires_docs":
        return "Upload requested documents.";
      case "in_review":
        return "Your application is under review.";
      case "ready_for_lenders":
        return "We are preparing your application for lenders.";
      case "sent_to_lenders":
        return "Lenders are reviewing your file.";
      case "approved":
        return "Your application was approved.";
      case "declined":
        return "Your application was declined.";
      default:
        return "Check your application progress.";
    }
  }

  public createClientPortalSession(options: {
    applicationId?: string;
    applicantEmail?: string;
    silo: string;
  }): ClientPortalSession {
    const app = this.resolvePortalApplication(
      options.applicationId,
      options.applicantEmail,
    );
    return this.buildPortalSession(app, options.silo);
  }

  public getClientPortalSession(
    applicationId: string,
    silo: string,
  ): ClientPortalSession {
    const app = this.resolvePortalApplication(applicationId, undefined);
    return this.buildPortalSession(app, silo);
  }
}

export const applicationService = new ApplicationService();
export type ApplicationServiceType = ApplicationService;
export const createApplicationService = (
  options: ApplicationServiceOptions = {},
): ApplicationService => new ApplicationService(options);
