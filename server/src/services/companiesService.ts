// server/src/services/companiesService.ts
import { db } from "../db/registry.js";
import { companies } from "../db/schema/companies.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const companiesService = {
  async list() {
    return db.select().from(companies);
  },

  async get(id: string) {
    const rows = await db.select().from(companies).where(eq(companies.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    await db.insert(companies).values({ id, ...data });
    return this.get(id);
  },

  async update(id: string, data: any) {
    await db.update(companies).set(data).where(eq(companies.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(companies).where(eq(companies.id, id));
  },
};
