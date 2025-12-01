import { notificationsRepo } from "../db/repositories/notifications.repo";

export const notificationsService = {
  async create(userId: string, message: string) {
    return notificationsRepo.insert({
      userId,
      message,
      read: false,
      createdAt: new Date()
    });
  },

  async markRead(id: string) {
    return notificationsRepo.markRead(id);
  },

  async list(userId: string) {
    return notificationsRepo.listByUser(userId);
  }
};
