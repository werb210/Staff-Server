// server/src/services/applicationsService.ts
import { db } from "../db/registry.js";
import { applications } from "../db/schema/applications.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const applicationsService = {
  async list() {
    return db.select().from(applications);
  },

  async get(id: string) {
    const rows = await db.select().from(applications).where(eq(applications.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    await db.insert(applications).values({ id, ...data });
    return this.get(id);
  },

  async update(id: string, data: any) {
    await db.update(applications).set(data).where(eq(applications.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(applications).where(eq(applications.id, id));
  },
};
