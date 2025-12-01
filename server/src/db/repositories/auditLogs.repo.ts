import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { auditLogs } from '../schema/audit.js';

const buildWhere = (filter: Partial<typeof auditLogs.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((auditLogs as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const auditLogsRepo = {
  async create(data: Partial<typeof auditLogs.$inferInsert>) {
    const [created] = await db.insert(auditLogs).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof auditLogs.$inferInsert>) {
    const [updated] = await db
      .update(auditLogs)
      .set(data)
      .where(eq(auditLogs.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(auditLogs).where(eq(auditLogs.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof auditLogs.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(auditLogs);
    if (where) query.where(where);
    return query;
  },
};

export default auditLogsRepo;
