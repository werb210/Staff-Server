import { randomUUID } from "crypto";

type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

const notifications: Notification[] = [];

export const notificationsRepo = {
  async insert(data: Omit<Notification, "id">) {
    const record: Notification = { id: randomUUID(), ...data };
    notifications.push(record);
    return record;
  },

  async markRead(id: string) {
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) return null;
    notifications[index] = { ...notifications[index], read: true };
    return notifications[index];
  },

  async listByUser(userId: string) {
    return notifications.filter((n) => n.userId === userId);
  }
};

export default notificationsRepo;
