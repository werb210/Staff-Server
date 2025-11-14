import { db, type Silo } from "./db.js";

export const notificationService = {
  trigger(silo: Silo, data: any) {
    const record = {
      id: db.id(),
      silo,
      ...data,
      createdAt: new Date().toISOString(),
    };
    db.notifications[silo].data.push(record);
    return record;
  },
};
