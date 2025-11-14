import { prisma } from "./prisma.js";
import type { Silo } from "./db.js";

export async function createUser(data: any) {
  return prisma.user.create({ data });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function assignUserSilos(id: string, silos: Silo[]) {
  return prisma.user.update({
    where: { id },
    data: { silos },
  });
}
