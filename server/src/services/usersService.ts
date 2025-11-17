// server/src/services/usersService.ts
import { db } from "../db/registry.js";
import { users } from "../db/schema/users.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

export const usersService = {
  async list() {
    return db.select().from(users);
  },

  async get(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0] ?? null;
  },

  async create(data: any) {
    const id = uuid();
    const hashed = await bcrypt.hash(data.password, 10);

    await db.insert(users).values({
      id,
      email: data.email,
      passwordHash: hashed,
      role: data.role ?? "staff",
    });

    return this.get(id);
  },

  async update(id: string, data: any) {
    let patch = { ...data };

    if (data.password) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
      delete patch.password;
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    return this.get(id);
  },

  async remove(id: string) {
    await db.delete(users).where(eq(users.id, id));
  },
};
