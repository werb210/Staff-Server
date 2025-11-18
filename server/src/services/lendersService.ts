// server/src/services/lendersService.ts
import { prisma } from "../db/index.js";

export const lendersService = {
  list() {
    return prisma.lender.findMany({ include: { products: true } });
  },

  get(id) {
    return prisma.lender.findUnique({
      where: { id },
      include: { products: true },
    });
  },

  create(data) {
    return prisma.lender.create({ data });
  },

  update(id, data) {
    return prisma.lender.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.lender.delete({ where: { id } });
  },
};
