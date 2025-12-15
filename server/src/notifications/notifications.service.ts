import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";

export type NotificationType =
  | "new_sms"
  | "new_chat_message"
  | "issue_reported"
  | "task_assigned"
  | "application_status_changed"
  | "docs_missing"
  | "docs_uploaded"
  | "banking_analysis_completed"
  | "ocr_completed";

export class NotificationsService {
  constructor(private database = db) {}

  async create(userId: string, type: NotificationType, payload: Record<string, any> = {}) {
    const [record] = await this.database
      .insert(notifications)
      .values({ userId, type, payloadJson: payload })
      .returning();
    return record;
  }

  async listForUser(userId: string) {
    return this.database
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(asc(notifications.createdAt));
  }

  async markAllRead(userId: string) {
    await this.database.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }
}
