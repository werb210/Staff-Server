"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const applications_repository_1 = require("../applications/applications.repository");
const timeline_service_1 = require("../applications/timeline.service");
const notifications_service_1 = require("../notifications/notifications.service");
class TasksService {
    database;
    timeline;
    notifications;
    constructor(database = db_1.db) {
        this.database = database;
        this.timeline = new timeline_service_1.TimelineService(new applications_repository_1.DrizzleApplicationsRepository(database));
        this.notifications = new notifications_service_1.NotificationsService(database);
    }
    async createTask(params) {
        const [record] = await this.database
            .insert(schema_1.tasks)
            .values({
            assignedByUserId: params.assignedByUserId,
            assignedToUserId: params.assignedToUserId ?? null,
            applicationId: params.applicationId ?? null,
            title: params.title,
            description: params.description ?? "",
            dueDate: params.dueDate ? new Date(params.dueDate) : null,
        })
            .returning();
        if (params.applicationId) {
            await this.timeline.logEvent(params.applicationId, "TASK_ASSIGNED", { taskId: record.id });
        }
        if (params.assignedToUserId) {
            await this.notifications.create(params.assignedToUserId, "task_assigned", { taskId: record.id });
        }
        return record;
    }
    async listMyTasks(userId) {
        return this.database
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.assignedToUserId, userId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.tasks.dueDate), (0, drizzle_orm_1.asc)(schema_1.tasks.createdAt));
    }
    async updateTask(id, updates) {
        const [updated] = await this.database
            .update(schema_1.tasks)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .returning();
        return updated ?? null;
    }
    async deleteTask(id) {
        await this.database.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
    }
    async completeTask(id) {
        const [updated] = await this.database
            .update(schema_1.tasks)
            .set({ status: "completed", updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .returning();
        if (updated?.applicationId) {
            await this.timeline.logEvent(updated.applicationId, "TASK_COMPLETED", { taskId: updated.id });
        }
        return updated;
    }
}
exports.TasksService = TasksService;
