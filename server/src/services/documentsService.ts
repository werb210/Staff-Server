// server/src/services/documentsService.ts
import { db } from "../db/registry.js";
import { documents } from "../db/schema/documents.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const documentsService = {
  async list() {
    return db.select().from(documents);
  },

  async get(id: string) {
    const rows = await db.select().from(documents).where(eq(documents.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    await db.insert(documents).values({ id, ...data });
    return this.get(id);
  },

  async update(id: string, data: any) {
    await db.update(documents).set(data).where(eq(documents.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  },
};
