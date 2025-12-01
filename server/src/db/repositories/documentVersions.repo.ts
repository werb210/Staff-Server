import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { documentVersions } from '../schema/documentVersions.js';

const buildWhere = (filter: Partial<typeof documentVersions.$inferSelect> = {}) => {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => eq((documentVersions as any)[key], value as any));
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const documentVersionsRepo = {
  async create(data: Partial<typeof documentVersions.$inferInsert>) {
    const [created] = await db.insert(documentVersions).values(data as any).returning();
    return created;
  },

  async createVersion(documentId: string, data: Partial<typeof documentVersions.$inferInsert>) {
    const existing = await this.findMany({ documentId });
    const versionNumber = existing.length + 1;
    return this.create({
      ...data,
      documentId,
      versionNumber
    });
  },

  async update(id: string, data: Partial<typeof documentVersions.$inferInsert>) {
    const [updated] = await db
      .update(documentVersions)
      .set(data)
      .where(eq(documentVersions.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: string) {
    const [deleted] = await db.delete(documentVersions).where(eq(documentVersions.id, id)).returning();
    return deleted ?? null;
  },

  async findById(id: string) {
    const [record] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return record ?? null;
  },

  async findMany(filter: Partial<typeof documentVersions.$inferSelect> = {}) {
    const where = buildWhere(filter);
    const query = db.select().from(documentVersions);
    if (where) query.where(where);
    return query;
  },

  async listVersions(documentId: string) {
    return this.findMany({ documentId });
  }
};

export default documentVersionsRepo;
