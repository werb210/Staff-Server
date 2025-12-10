import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";
import { NotificationsService } from "../notifications/notifications.service";

export class TasksService {
  private timeline: TimelineService;
  private notifications: NotificationsService;

  constructor(private database = db) {
    this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
    this.notifications = new NotificationsService(database);
  }

  async createTask(params: {
    assignedByUserId: string;
    assignedToUserId?: string;
    applicationId?: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) {
    const [record] = await this.database
      .insert(tasks)
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

  async listMyTasks(userId: string) {
    return this.database
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToUserId, userId))
      .orderBy(asc(tasks.dueDate), asc(tasks.createdAt));
  }

  async updateTask(id: string, updates: Partial<typeof tasks.$inferInsert>) {
    const [updated] = await this.database
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteTask(id: string) {
    await this.database.delete(tasks).where(eq(tasks.id, id));
  }

  async completeTask(id: string) {
    const [updated] = await this.database
      .update(tasks)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    if (updated?.applicationId) {
      await this.timeline.logEvent(updated.applicationId, "TASK_COMPLETED", { taskId: updated.id });
    }

    return updated;
  }
}
