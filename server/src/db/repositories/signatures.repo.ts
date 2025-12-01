import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { signatures } from '../schema/signatures.js';

const buildWhere = (filter: Partial<typeof signatures.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((signatures as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const signaturesRepo = {
  async create(data: Partial<typeof signatures.$inferInsert>) {
    const [created] = await db.insert(signatures).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof signatures.$inferInsert>) {
    const [updated] = await db
      .update(signatures)
      .set(data)
      .where(eq(signatures.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(signatures).where(eq(signatures.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(signatures).where(eq(signatures.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof signatures.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(signatures);
    if (where) query.where(where);
    return query;
  },
};

export default signaturesRepo;
