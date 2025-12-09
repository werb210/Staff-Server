import { ZodError } from "zod";
import { applicationStatusEnum } from "../db/schema";
import { DrizzleApplicationsRepository } from "./applications.repository";
import { pipelineService, PipelineService } from "./pipeline.service";
import { TimelineService } from "./timeline.service";
import { ApplicationsRepository } from "./types";
import {
  createApplicationSchema,
  statusChangeSchema,
  updateApplicationSchema,
} from "./applications.validators";

export class ApplicationsService {
  private repo: ApplicationsRepository;
  private pipeline: PipelineService;
  private timeline: TimelineService;

  constructor(repo?: ApplicationsRepository, pipeline?: PipelineService) {
    this.repo = repo ?? new DrizzleApplicationsRepository();
    this.pipeline = pipeline ?? pipelineService;
    this.timeline = new TimelineService(this.repo);
  }

  async createApplication(payload: unknown, actorUserId?: string) {
    const parsed = createApplicationSchema.parse(payload);
    const status = this.pipeline.initialStatus(parsed.productCategory);
    const now = new Date();

    const created = await this.repo.createApplication({
      ...parsed,
      status,
      createdAt: now,
      updatedAt: now,
    });

    await this.repo.addStatusHistory({
      applicationId: created.id,
      fromStatus: null as any,
      toStatus: status,
      timestamp: now,
      changedBy: actorUserId ?? null,
    });

    await this.timeline.logEvent(
      created.id,
      "application_created",
      { status, productCategory: parsed.productCategory },
      actorUserId,
    );

    if (parsed.signatureData) {
      await this.timeline.logEvent(created.id, "signature_submitted", {}, actorUserId);
    }

    return this.getApplicationWithDetails(created.id);
  }

  async updateApplication(id: string, payload: unknown, actorUserId?: string) {
    const parsed = updateApplicationSchema.parse(payload);
    const existing = await this.repo.findApplicationById(id);
    if (!existing) return null;

    await this.repo.updateApplication(id, parsed as any);
    await this.timeline.logEvent(
      id,
      "application_updated",
      { fields: Object.keys(parsed) },
      actorUserId,
    );

    if (parsed.signatureData) {
      await this.timeline.logEvent(id, "signature_submitted", {}, actorUserId);
    }

    return this.getApplicationWithDetails(id);
  }

  async getApplicationWithDetails(id: string) {
    const app = await this.repo.findApplicationById(id);
    if (!app) return null;
    const owners = await this.repo.listOwners(id);
    const statusHistory = await this.repo.listStatusHistory(id);
    return { ...app, owners, statusHistory };
  }

  async listApplications() {
    const apps = await this.repo.listApplications();
    const withOwners = await Promise.all(
      apps.map(async (app) => ({
        ...app,
        owners: await this.repo.listOwners(app.id),
        statusHistory: await this.repo.listStatusHistory(app.id),
      })),
    );
    return withOwners;
  }

  async changeStatus(id: string, payload: unknown, actorUserId?: string) {
    const parsed = statusChangeSchema.parse(payload);
    const app = await this.repo.findApplicationById(id);
    if (!app) return null;

    const currentStatus = app.status as (typeof applicationStatusEnum.enumValues)[number];
    if (!this.pipeline.canTransition(currentStatus, parsed.status)) {
      throw new Error("Status transition not allowed");
    }

    await this.repo.updateApplication(id, { status: parsed.status });
    await this.repo.addStatusHistory({
      applicationId: id,
      fromStatus: currentStatus,
      toStatus: parsed.status,
      timestamp: new Date(),
      changedBy: actorUserId ?? null,
    });

    await this.timeline.logEvent(
      id,
      "status_changed",
      { from: currentStatus, to: parsed.status },
      actorUserId,
    );

    return this.getApplicationWithDetails(id);
  }

  async assignApplication(id: string, assignedTo: string | null, actorUserId?: string) {
    const app = await this.repo.findApplicationById(id);
    if (!app) return null;
    await this.repo.updateApplication(id, { assignedTo: assignedTo ?? null });
    await this.timeline.logEvent(id, "application_assigned", { assignedTo }, actorUserId);
    return this.getApplicationWithDetails(id);
  }

  async getTimeline(id: string) {
    return this.timeline.listEvents(id);
  }
}

export function mapZodError(error: unknown) {
  if (error instanceof ZodError) {
    return { error: "Validation failed", details: error.errors };
  }
  return { error: "Invalid payload" };
}
