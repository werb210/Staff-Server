import { randomUUID } from "crypto";
import { requireUserSiloAccess, type Silo, type UserContext } from "./prisma.js";

type NotificationPayload = Record<string, unknown>;

type NotificationRecord = {
  id: string;
  silo: Silo;
  userId: string | undefined;
  payload: NotificationPayload;
  createdAt: Date;
};

const notifications: NotificationRecord[] = [];

export const notificationService = {
  async trigger(
    user: UserContext,
    silo: Silo,
    payload: NotificationPayload
  ): Promise<NotificationRecord> {
    requireUserSiloAccess(user.silos, silo);

    const record: NotificationRecord = {
      id: randomUUID(),
      silo,
      userId: user.id,
      payload,
      createdAt: new Date(),
    };

    notifications.push(record);
    return record;
  },

  list() {
    return [...notifications];
  },
};
