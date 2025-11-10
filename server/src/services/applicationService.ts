import { randomUUID } from "node:crypto";
import {
  parseCompleteApplicationInput,
  parseCreateApplicationInput,
  parseSubmitApplicationInput,
  type ApplicationSummary,
  type CompleteApplicationInput,
  type CreateApplicationInput,
  type PublicApplication,
  type SubmitApplicationInput
} from "../schemas/application.schema.js";
import { parseUploadDocumentInput, type Document } from "../schemas/document.schema.js";
import { applicationStatusSchema } from "../schemas/application.schema.js";
import { documentService } from "./documentService.js";

interface InternalApplication extends ApplicationSummary {
  documents: Document[];
}

function now(): string {
  return new Date().toISOString();
}

class ApplicationService {
  private readonly applications = new Map<string, InternalApplication>();

  constructor() {
    const seed = this.createInternalApplication({
      applicant: {
        id: randomUUID(),
        firstName: "Jamie",
        lastName: "Rivera",
        email: "jamie.rivera@example.com",
        phone: "+15554443333"
      },
      loanDetails: {
        amountRequested: 125000,
        termMonths: 48,
        purpose: "Expansion of warehouse facility",
        collateral: "Warehouse equipment"
      },
      documents: []
    });
    seed.status = "submitted";
    this.applications.set(seed.id, seed);
  }

  listApplications(): ApplicationSummary[] {
    return Array.from(this.applications.values()).map((application) => this.toSummary(application));
  }

  listPublicApplications(): PublicApplication[] {
    return this.listApplications().map((application) => ({
      id: application.id,
      loanDetails: application.loanDetails,
      status: application.status,
      createdAt: application.createdAt
    }));
  }

  createApplication(input: unknown): ApplicationSummary {
    const payload = parseCreateApplicationInput(input);
    const application = this.createInternalApplication(payload);
    this.applications.set(application.id, application);
    return this.toSummary(application);
  }

  submitApplication(input: unknown): { applicationId: string; status: ApplicationSummary["status"]; submittedBy: string } {
    const payload: SubmitApplicationInput = parseSubmitApplicationInput(input);
    const application = this.getApplication(payload.applicationId);
    application.status = "submitted";
    application.updatedAt = now();
    this.applications.set(application.id, application);
    return { applicationId: application.id, status: application.status, submittedBy: payload.submittedBy };
  }

  completeApplication(input: unknown): { applicationId: string; status: ApplicationSummary["status"] } {
    const payload: CompleteApplicationInput = parseCompleteApplicationInput(input);
    const application = this.getApplication(payload.applicationId);
    application.status = "completed";
    application.updatedAt = now();
    this.applications.set(application.id, application);
    return { applicationId: application.id, status: application.status };
  }

  async uploadSupportingDocument(input: unknown): Promise<Document> {
    const payload = parseUploadDocumentInput(input);
    const application = this.getApplication(payload.applicationId);
    const document = await documentService.uploadDocument({
      ...payload,
      applicationId: application.id
    });
    application.documents.push(document);
    application.updatedAt = now();
    this.applications.set(application.id, application);
    return document;
  }

  getApplication(applicationId: string): InternalApplication {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }
    return application;
  }

  private createInternalApplication(payload: CreateApplicationInput): InternalApplication {
    const id = randomUUID();
    const timestamp = now();
    const application: InternalApplication = {
      id,
      applicant: {
        ...payload.applicant,
        phone: payload.applicant.phone
      },
      loanDetails: payload.loanDetails,
      status: applicationStatusSchema.enum.draft,
      createdAt: timestamp,
      updatedAt: timestamp,
      documents: []
    };

    payload.documents.forEach((doc) => {
      application.documents.push({
        id: randomUUID(),
        applicationId: id,
        name: doc.name,
        type: "other",
        mimeType: "application/octet-stream",
        url: doc.url,
        checksum: doc.checksum,
        uploadedAt: timestamp,
        status: "received"
      });
    });

    return application;
  }

  private toSummary(application: InternalApplication): ApplicationSummary {
    return {
      id: application.id,
      applicant: application.applicant,
      loanDetails: application.loanDetails,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt
    };
  }
}

export const applicationService = new ApplicationService();
export type { ApplicationSummary } from "../schemas/application.schema.js";
