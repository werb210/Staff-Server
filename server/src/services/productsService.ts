// server/src/services/productsService.ts
import { prisma } from "../db/index.js";

export const productsService = {
  list() {
    return prisma.product.findMany();
  },

  get(id) {
    return prisma.product.findUnique({ where: { id } });
  },

  create(data) {
    return prisma.product.create({ data });
  },

  update(id, data) {
    return prisma.product.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.product.delete({ where: { id } });
  },
};
