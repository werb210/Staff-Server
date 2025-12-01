import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { documents } from '../schema/documents.js';

const buildWhere = (filter: Partial<typeof documents.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((documents as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const documentsRepo = {
  async create(data: Partial<typeof documents.$inferInsert> & Record<string, any>) {
    const [created] = await db.insert(documents).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof documents.$inferInsert>) {
    const [updated] = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();
    return deleted ?? null;
  },

  async remove(id: string) {
    return this.delete(id);
  },

  async findById(id: string) {
    const [record] = await db.select().from(documents).where(eq(documents.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof documents.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(documents);
    if (where) query.where(where);
    return query;
  },

  async listByApplication(applicationId: string) {
    return this.findMany({ applicationId });
  }
};

export default documentsRepo;
