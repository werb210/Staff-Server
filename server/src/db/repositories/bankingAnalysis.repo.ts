import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { bankingAnalysis } from '../schema/banking.js';

const buildWhere = (filter: Partial<typeof bankingAnalysis.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((bankingAnalysis as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const bankingAnalysisRepo = {
  async create(data: Partial<typeof bankingAnalysis.$inferInsert>) {
    const [created] = await db.insert(bankingAnalysis).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof bankingAnalysis.$inferInsert>) {
    const [updated] = await db
      .update(bankingAnalysis)
      .set(data)
      .where(eq(bankingAnalysis.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(bankingAnalysis).where(eq(bankingAnalysis.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(bankingAnalysis).where(eq(bankingAnalysis.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof bankingAnalysis.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(bankingAnalysis);
    if (where) query.where(where);
    return query;
  },
};

export default bankingAnalysisRepo;
