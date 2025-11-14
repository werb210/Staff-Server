import { prisma } from "./prisma.js";
import type { Silo, UserContext } from "./prisma.js";
import { requireUserSiloAccess } from "./prisma.js";

export async function listLenders(user: UserContext, silo: Silo) {
  requireUserSiloAccess(user.silos, silo);
  return prisma.lender.findMany({
    where: { silo },
    include: { products: true },
    orderBy: { name: "asc" }
  });
}

export async function listProductsForSilo(user: UserContext, silo: Silo) {
  requireUserSiloAccess(user.silos, silo);
  return prisma.lenderProduct.findMany({
    where: { silo },
    orderBy: { name: "asc" }
  });
}
