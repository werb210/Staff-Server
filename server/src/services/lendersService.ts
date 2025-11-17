// server/src/services/lendersService.ts
import { db } from "../db/registry.js";
import { lenders } from "../db/schema/lenders.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const lendersService = {
  async list() {
    return db.select().from(lenders);
  },

  async get(id: string) {
    const rows = await db.select().from(lenders).where(eq(lenders.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    await db.insert(lenders).values({ id, ...data });
    return this.get(id);
  },

  async update(id: string, data: any) {
    await db.update(lenders).set(data).where(eq(lenders.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(lenders).where(eq(lenders.id, id));
  },
};
