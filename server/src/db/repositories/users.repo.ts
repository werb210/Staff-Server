import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../schema/users.js';

const buildWhere = (filter: Partial<typeof users.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((users as any)[key], value as any));

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const usersRepo = {
  async create(data: Partial<typeof users.$inferInsert>) {
    const [created] = await db.insert(users).values(data as any).returning();
    return created;
  },

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(users).where(eq(users.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof users.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(users);
    if (where) {
      query.where(where);
    }
    return query;
  },
};

export default usersRepo;
