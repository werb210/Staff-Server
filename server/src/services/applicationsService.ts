import { randomUUID } from "crypto";
import {
  ApplicationCreateInput,
  ApplicationStatus,
  ApplicationUpdateInput,
} from "../schemas/applicationSchemas.js";
import { logInfo } from "../utils/logger.js";
import { Application } from "../types/index.js";

class ApplicationsService {
  private applications = new Map<string, Application>();

  constructor() {
    const seedId = randomUUID();
    const now = new Date().toISOString();
    this.applications.set(seedId, {
      id: seedId,
      applicantName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1234567890",
      amount: 250000,
      productType: "mortgage",
      notes: "Seed application",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  }

  createApplication(payload: ApplicationCreateInput): Application {
    logInfo("Creating application", payload);
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const application: Application = {
      id,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...payload,
    };
    this.applications.set(id, application);
    return application;
  }

  listApplications(status?: ApplicationStatus): Application[] {
    logInfo("Listing applications", { status });
    const items = Array.from(this.applications.values());
    return status ? items.filter((item) => item.status === status) : items;
  }

  submitApplication(id: string, submittedBy: string): Application {
    logInfo("Submitting application", { id, submittedBy });
    const application = this.getApplicationOrThrow(id);
    const updated = {
      ...application,
      status: "submitted" as const,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  completeApplication(id: string, completedBy: string): Application {
    logInfo("Completing application", { id, completedBy });
    const application = this.getApplicationOrThrow(id);
    const updated = {
      ...application,
      status: "completed" as const,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  updateApplication(id: string, updates: ApplicationUpdateInput): Application {
    logInfo("Updating application", { id, updates });
    const application = this.getApplicationOrThrow(id);
    const updated = {
      ...application,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  deleteApplication(id: string): boolean {
    logInfo("Deleting application", { id });
    return this.applications.delete(id);
  }

  private getApplicationOrThrow(id: string): Application {
    const application = this.applications.get(id);
    if (!application) {
      throw new Error(`Application ${id} not found`);
    }
    return application;
  }
}

export const applicationsService = new ApplicationsService();
