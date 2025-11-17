// server/src/services/notificationsService.ts
import { db } from "../db/registry.js";
import { notifications } from "../db/schema/notifications.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const notificationsService = {
  async list() {
    return db.select().from(notifications);
  },

  async get(id: string) {
    const rows = await db.select().from(notifications).where(eq(notifications.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    await db.insert(notifications).values({ id, ...data });
    return this.get(id);
  },

  async update(id: string, data: any) {
    await db.update(notifications).set(data).where(eq(notifications.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(notifications).where(eq(notifications.id, id));
  },
};
