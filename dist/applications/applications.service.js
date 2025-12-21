"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
exports.mapZodError = mapZodError;
const zod_1 = require("zod");
const applications_repository_1 = require("./applications.repository");
const pipeline_service_1 = require("./pipeline.service");
const timeline_service_1 = require("./timeline.service");
const applications_validators_1 = require("./applications.validators");
class ApplicationsService {
    repo;
    pipeline;
    timeline;
    constructor(repo, pipeline) {
        this.repo = repo ?? new applications_repository_1.DrizzleApplicationsRepository();
        this.pipeline = pipeline ?? pipeline_service_1.pipelineService;
        this.timeline = new timeline_service_1.TimelineService(this.repo);
    }
    async createApplication(payload, actorUserId) {
        const parsed = applications_validators_1.createApplicationSchema.parse(payload);
        if (!parsed.productCategory) {
            throw new Error("productCategory is required");
        }
        const productCategory = parsed.productCategory;
        const status = this.pipeline.initialStatus(productCategory);
        const now = new Date();
        const created = await this.repo.createApplication({
            productCategory: parsed.productCategory,
            status: status,
            assignedTo: parsed.assignedTo,
            createdAt: now,
            updatedAt: now,
        });
        await this.repo.addStatusHistory({
            applicationId: created.id,
            fromStatus: null,
            toStatus: status,
            timestamp: now,
            changedBy: actorUserId ?? null,
        });
        await this.timeline.logEvent(created.id, "application_created", { status, productCategory }, actorUserId);
        if (parsed.signatureData) {
            await this.timeline.logEvent(created.id, "signature_submitted", {}, actorUserId);
        }
        return this.getApplicationWithDetails(created.id);
    }
    async updateApplication(id, payload, actorUserId) {
        const parsed = applications_validators_1.updateApplicationSchema.parse(payload);
        const existing = await this.repo.findApplicationById(id);
        if (!existing)
            return null;
        const updatePayload = {
            ...parsed,
            productCategory: parsed.productCategory ?? existing.productCategory,
        };
        await this.repo.updateApplication(id, updatePayload);
        await this.timeline.logEvent(id, "application_updated", { fields: Object.keys(parsed) }, actorUserId);
        if (parsed.signatureData) {
            await this.timeline.logEvent(id, "signature_submitted", {}, actorUserId);
        }
        return this.getApplicationWithDetails(id);
    }
    async acceptApplication(id, actorUserId) {
        const result = await this.changeStatus(id, { status: "accepted" }, actorUserId);
        if (!result)
            return null;
        await this.timeline.logEvent(id, "application_accepted", {}, actorUserId);
        return result;
    }
    async declineApplication(id, payload, actorUserId) {
        const parsed = applications_validators_1.declineSchema.parse(payload);
        const result = await this.changeStatus(id, { status: "declined" }, actorUserId);
        if (!result)
            return null;
        await this.timeline.logEvent(id, "application_declined", { reason: parsed.reason ?? null }, actorUserId);
        return result;
    }
    async getApplicationWithDetails(id) {
        const app = await this.repo.findApplicationById(id);
        if (!app)
            return null;
        const owners = await this.repo.listOwners(id);
        const statusHistory = await this.repo.listStatusHistory(id);
        return { ...app, owners, statusHistory };
    }
    async listApplications() {
        const apps = await this.repo.listApplications();
        return Promise.all(apps.map(async (app) => ({
            ...app,
            owners: await this.repo.listOwners(app.id),
            statusHistory: await this.repo.listStatusHistory(app.id),
        })));
    }
    async changeStatus(id, payload, actorUserId) {
        const parsed = applications_validators_1.statusChangeSchema.parse(payload);
        const app = await this.repo.findApplicationById(id);
        if (!app)
            return null;
        const currentStatus = app.status;
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
        await this.timeline.logEvent(id, "status_changed", { from: currentStatus, to: parsed.status }, actorUserId);
        return this.getApplicationWithDetails(id);
    }
    async assignApplication(id, assignedTo, actorUserId) {
        const app = await this.repo.findApplicationById(id);
        if (!app)
            return null;
        await this.repo.updateApplication(id, {
            assignedTo: assignedTo ?? null,
        });
        await this.timeline.logEvent(id, "application_assigned", { assignedTo }, actorUserId);
        return this.getApplicationWithDetails(id);
    }
    async getTimeline(id) {
        return this.timeline.listEvents(id);
    }
}
exports.ApplicationsService = ApplicationsService;
function mapZodError(error) {
    if (error instanceof zod_1.ZodError) {
        return { error: "Validation failed", details: error.errors };
    }
    return { error: "Invalid payload" };
}
