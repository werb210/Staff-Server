import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { lenders } from '../schema/lenders.js';

const buildWhere = (filter: Partial<typeof lenders.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((lenders as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const lendersRepo = {
  async create(data: Partial<typeof lenders.$inferInsert>) {
    const [created] = await db.insert(lenders).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof lenders.$inferInsert>) {
    const [updated] = await db
      .update(lenders)
      .set(data)
      .where(eq(lenders.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(lenders).where(eq(lenders.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(lenders).where(eq(lenders.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof lenders.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(lenders);
    if (where) query.where(where);
    return query;
  },

  async listAll() {
    return this.findMany();
  }
};

export default lendersRepo;
