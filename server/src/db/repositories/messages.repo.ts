import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { messages } from '../schema/messages.js';

const buildWhere = (filter: Partial<typeof messages.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((messages as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const messagesRepo = {
  async create(data: Partial<typeof messages.$inferInsert>) {
    const [created] = await db.insert(messages).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof messages.$inferInsert>) {
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(messages).where(eq(messages.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(messages).where(eq(messages.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof messages.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(messages);
    if (where) query.where(where);
    return query;
  },
};

export default messagesRepo;
