// ============================================================================
// server/src/services/notificationsService.ts
// BLOCK 18 — Complete rewrite for Prisma
// ============================================================================

import db from "../db/index.js";

const notificationsService = {
  /**
   * Fetch all notifications for a user
   * @param {string} userId
   */
  async list(userId) {
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
    });
  },

  /**
   * Create a notification
   * @param {string} userId
   * @param {object} data
   */
  async create(userId, data) {
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
    });
  },

  /**
   * Mark a notification as read
   * @param {string} id
   */
  async markRead(id) {
    return db.notification.update({
      where: { id },
      data: { read: true },
      select: {
        id: true,
        title: true,
        read: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Mark ALL notifications for a user as read
   * @param {string} userId
   */
  async markAllRead(userId) {
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
  async delete(id) {
    await db.notification.delete({ where: { id } });
    return { deleted: true };
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId) {
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
