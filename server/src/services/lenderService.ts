import type { Lender, LenderProduct, Prisma } from "@prisma/client";
import {
  prisma,
  requireUserSiloAccess,
  type Silo,
  type UserContext,
} from "./prisma.js";

export const lenderService = {
  async list(user: UserContext, silo: Silo): Promise<Lender[]> {
    requireUserSiloAccess(user.silos, silo);

    return prisma.lender.findMany({
      where: { silo },
      include: { products: true },
      orderBy: { name: "asc" },
    });
  },

  async create(
    user: UserContext,
    silo: Silo,
    data: Prisma.LenderCreateInput | Prisma.LenderUncheckedCreateInput
  ): Promise<Lender> {
    requireUserSiloAccess(user.silos, silo);

    return prisma.lender.create({
      data: {
        ...data,
        silo,
      },
    });
  },

  async update(
    user: UserContext,
    silo: Silo,
    id: string,
    data: Prisma.LenderUpdateInput
  ): Promise<Lender | null> {
    requireUserSiloAccess(user.silos, silo);

    const existing = await prisma.lender.findFirst({ where: { id, silo } });
    if (!existing) return null;

    return prisma.lender.update({
      where: { id },
      data,
    });
  },

  async remove(user: UserContext, silo: Silo, id: string): Promise<boolean> {
    requireUserSiloAccess(user.silos, silo);

    const result = await prisma.lender.deleteMany({ where: { id, silo } });
    return result.count > 0;
  },

  async listProducts(
    user: UserContext,
    silo: Silo,
    lenderId: string
  ): Promise<LenderProduct[]> {
    requireUserSiloAccess(user.silos, silo);

    return prisma.lenderProduct.findMany({
      where: { silo, lenderId },
      orderBy: { name: "asc" },
    });
  },

  async createProduct(
    user: UserContext,
    silo: Silo,
    lenderId: string,
    data:
      | Prisma.LenderProductCreateInput
      | Prisma.LenderProductUncheckedCreateInput
  ): Promise<LenderProduct | null> {
    requireUserSiloAccess(user.silos, silo);

    const lender = await prisma.lender.findFirst({ where: { id: lenderId, silo } });
    if (!lender) return null;

    return prisma.lenderProduct.create({
      data: {
        ...data,
        silo,
        lenderId,
      },
    });
  },
};
