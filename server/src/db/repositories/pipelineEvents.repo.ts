import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { pipelineEvents } from '../schema/pipeline.js';

const buildWhere = (filter: Partial<typeof pipelineEvents.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((pipelineEvents as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const pipelineEventsRepo = {
  async create(data: Partial<typeof pipelineEvents.$inferInsert>) {
    const [created] = await db.insert(pipelineEvents).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof pipelineEvents.$inferInsert>) {
    const [updated] = await db
      .update(pipelineEvents)
      .set(data)
      .where(eq(pipelineEvents.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(pipelineEvents).where(eq(pipelineEvents.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(pipelineEvents).where(eq(pipelineEvents.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof pipelineEvents.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(pipelineEvents);
    if (where) query.where(where);
    return query;
  },
};

export default pipelineEventsRepo;
