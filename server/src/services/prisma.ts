import { db, type Silo } from "./db.js";

export type { Silo } from "./db.js";

export type UserContext = { id?: string; silos: Silo[] };

export class SiloAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiloAccessError";
  }
}

export function requireUserSiloAccess(userSilos: Silo[], targetSilo: Silo) {
  if (!userSilos.includes(targetSilo)) {
    throw new SiloAccessError(
      `User is not authorized to access silo ${targetSilo}`
    );
  }
}

export const prisma = {
  auditLog: {
    async create({ data }: { data: any }) {
      const record = { id: db.id(), ...data, createdAt: new Date().toISOString() };
      db.auditLogs.push(record);
      return record;
    },
  },
  user: {
    async create({ data }: { data: any }) {
      const record = { id: db.id(), ...data, createdAt: new Date().toISOString() };
      db.users.data.push(record);
      return record;
    },
    async findUnique({ where }: { where: { id: string } }) {
      return db.users.data.find((u) => u.id === where.id) ?? null;
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const idx = db.users.data.findIndex((u) => u.id === where.id);
      if (idx === -1) throw new Error("User not found");
      db.users.data[idx] = { ...db.users.data[idx], ...data };
      return db.users.data[idx];
    },
  },
};
