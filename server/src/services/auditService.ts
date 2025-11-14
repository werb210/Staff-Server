import { prisma } from "./prisma.js";
import type { Silo, UserContext } from "./prisma.js";

export async function audit(user: UserContext | null, message: string, silo: Silo) {
  return prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      message,
      silo
    }
  });
}
