import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { auditLogs } from '../schema/audit.js';

const buildWhere = (filter: Record<string, unknown> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((auditLogs as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const mapRecord = (record: any) => {
  if (!record) return null;
  const details = (record.details ?? {}) as Record<string, unknown>;
  return { id: record.id, ...details, createdAt: record.createdAt } as any;
};

export const companiesRepo = {
  async create(data: Record<string, unknown>) {
    const [created] = await db
      .insert(auditLogs)
      .values({ eventType: 'company', details: data })
      .returning();
    return mapRecord(created);
  },

  async update(id: string, data: Record<string, unknown>) {
    const [existing] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    if (!existing || existing.eventType !== 'company') return null;
    const merged = { ...(existing.details ?? {}), ...data };
    const [updated] = await db
      .update(auditLogs)
      .set({ details: merged })
      .where(eq(auditLogs.id, id))
      .returning();
    return mapRecord(updated);
  },

  async delete(id: string) {
    const [deleted] = await db.delete(auditLogs).where(eq(auditLogs.id, id)).returning();
    return mapRecord(deleted);
  },

  async findById(id: string) {
    const [record] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    if (!record || record.eventType !== 'company') return null;
    return mapRecord(record);
  },

  async findMany(filter: Record<string, unknown> = {}) {
    const where = buildWhere({ ...filter, eventType: 'company' });
    const query = db.select().from(auditLogs);
    if (where) query.where(where);
    const results = await query;
    return results.filter((r) => r.eventType === 'company').map(mapRecord).filter(Boolean);
  },
};

export default companiesRepo;
