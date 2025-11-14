import type { Prisma, User } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { Silo } from "./prisma.js";

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function assignUserSilos(id: string, silos: Silo[]): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: { silos }
  });
}
