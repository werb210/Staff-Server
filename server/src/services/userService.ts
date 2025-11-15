import { prisma } from "./prisma.js";
import type { Silo } from "../types/index.js";

export async function createUserRecord(data: any) {
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
