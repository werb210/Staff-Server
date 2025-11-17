// server/src/services/applicationService.ts
import { db } from "../db/index.js";
import { applications } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const applicationService = {
  async all() {
    return db.select().from(applications);
  },

  async get(id: string) {
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    return rows[0] ?? null;
  },

  async create(input: any) {
    const id = uuid();
    await db.insert(applications).values({ id, ...input });
    return this.get(id);
  }
};
