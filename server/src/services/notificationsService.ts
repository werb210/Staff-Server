// ============================================================================
// server/src/services/notificationsService.ts
// BLOCK 18 — Complete rewrite for Prisma
// ============================================================================

import db from "../db/index.js";

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

export const notificationsService = {
  /**
   * Fetch all notifications for a user
   * @param {string} userId
   */
  async list(userId: string): Promise<NotificationListItem[]> {
    return db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        title: true,
        message: true,
        type: true,
        read: true,
        createdAt: true,
      },
    }) as Promise<NotificationListItem[]>;
  },

  /**
   * Create a notification
   * @param {string} userId
   * @param {object} data
   */
  async create(
    userId: string,
    data: NotificationCreateData,
  ): Promise<NotificationListItem> {
    return db.notification.create({
      data: {
        userId,
        title: data.title ?? "Notification",
        message: data.message ?? "",
        type: data.type ?? "info",
        read: false,
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        read: true,
        createdAt: true,
      },
    }) as Promise<NotificationListItem>;
  },

  /**
   * Mark a notification as read
   * @param {string} id
   */
  async markRead(id: string): Promise<NotificationSummary> {
    return db.notification.update({
      where: { id },
      data: { read: true },
      select: {
        id: true,
        title: true,
        read: true,
        updatedAt: true,
      },
    }) as Promise<NotificationSummary>;
  },

  /**
   * Mark ALL notifications for a user as read
   * @param {string} userId
   */
  async markAllRead(userId: string): Promise<{ updated: number; status: string }> {
    const result = await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return {
      updated: result.count,
      status: "ok",
    };
  },

  /**
   * Delete one notification
   */
  async delete(id: string): Promise<{ deleted: true }> {
    await db.notification.delete({ where: { id } });
    return { deleted: true };
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<{ deleted: number }> {
    const result = await db.notification.deleteMany({
      where: { userId },
    });

    return {
      deleted: result.count,
    };
  },
};

export default notificationsService;

// ============================================================================
// END OF FILE
// ============================================================================
