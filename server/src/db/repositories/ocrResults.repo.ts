import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { ocrResults } from '../schema/ocr.js';

const buildWhere = (filter: Partial<typeof ocrResults.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((ocrResults as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const ocrResultsRepo = {
  async create(data: Partial<typeof ocrResults.$inferInsert>) {
    const [created] = await db.insert(ocrResults).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof ocrResults.$inferInsert>) {
    const [updated] = await db
      .update(ocrResults)
      .set(data)
      .where(eq(ocrResults.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(ocrResults).where(eq(ocrResults.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(ocrResults).where(eq(ocrResults.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof ocrResults.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(ocrResults);
    if (where) query.where(where);
    return query;
  },
};

export default ocrResultsRepo;
