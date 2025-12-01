// =============================================================================
// server/src/services/notificationsService.ts
// Drizzle implementation using audit log repository
// =============================================================================

import auditLogsRepo from "../db/repositories/auditLogs.repo.js";

const EVENT_TYPE = "notification";

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type NotificationListItem = Pick<
  NotificationRecord,
  "id" | "userId" | "title" | "message" | "type" | "read" | "createdAt"
>;

type NotificationSummary = Pick<
  NotificationRecord,
  "id" | "title" | "read" | "updatedAt"
>;

type NotificationCreateData = Partial<
  Pick<NotificationRecord, "title" | "message" | "type">
>;

type NotificationUpdateData = Partial<
  Pick<NotificationRecord, "title" | "message" | "type" | "read">
>;

const mapRecord = (record: any): NotificationRecord | null => {
  if (!record || record.eventType !== EVENT_TYPE) return null;
  const details = record.details ?? {};
  return {
    id: record.id,
    userId: details.userId,
    title: details.title,
    message: details.message,
    type: details.type,
    read: Boolean(details.read),
    createdAt: record.createdAt,
    updatedAt: details.updatedAt ? new Date(details.updatedAt) : record.createdAt,
  };
};

const persistDetails = (data: any) => ({
  ...data,
  updatedAt: new Date(),
});

export const notificationsService = {
  /**
   * Fetch all notifications for a user
   * @param {string} userId
   */
  async list(userId: string): Promise<NotificationListItem[]> {
    const records = await auditLogsRepo.findMany({ eventType: EVENT_TYPE, userId } as any);
    return (await records)
      .map(mapRecord)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()) as NotificationListItem[];
  },

  /**
   * Fetch a single notification
   */
  async get(id: string): Promise<NotificationRecord | null> {
    return mapRecord(await auditLogsRepo.findById(id));
  },

  /**
   * Create a notification
   * @param {string} userId
   * @param {object} data
   */
  async create(userId: string, data: NotificationCreateData): Promise<NotificationListItem> {
    const created = await auditLogsRepo.create({
      eventType: EVENT_TYPE,
      userId,
      details: persistDetails({
        userId,
        title: data.title ?? "Notification",
        message: data.message ?? "",
        type: data.type ?? "info",
        read: false,
      }),
    });

    return mapRecord(created) as NotificationListItem;
  },

  /**
   * Update a notification
   */
  async update(id: string, data: NotificationUpdateData): Promise<NotificationRecord | null> {
    const existing = await auditLogsRepo.findById(id);
    if (!existing) return null;
    const details = persistDetails({ ...(existing.details ?? {}), ...data });
    return mapRecord(await auditLogsRepo.update(id, { details }));
  },

  /**
   * Mark a notification as read
   * @param {string} id
   */
  async markRead(id: string): Promise<NotificationSummary | null> {
    const updated = await this.update(id, { read: true });
    if (!updated) return null;
    return {
      id: updated.id,
      title: updated.title,
      read: updated.read,
      updatedAt: updated.updatedAt,
    };
  },

  /**
   * Mark ALL notifications for a user as read
   * @param {string} userId
   */
  async markAllRead(userId: string): Promise<{ updated: number; status: string }> {
    const list = await this.list(userId);
    await Promise.all(list.map((n) => this.update(n.id, { read: true })));
    return { updated: list.length, status: "ok" };
  },

  /**
   * Delete one notification
   */
  async delete(id: string): Promise<{ deleted: true }> {
    await auditLogsRepo.delete(id);
    return { deleted: true };
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<{ deleted: number }> {
    const list = await this.list(userId);
    await Promise.all(list.map((n) => auditLogsRepo.delete(n.id)));
    return { deleted: list.length };
  },

  /**
   * Alias to match legacy controller name
   */
  async remove(id: string): Promise<{ deleted: true }> {
    return this.delete(id);
  },
};

// =============================================================================
// END OF FILE
// =============================================================================
