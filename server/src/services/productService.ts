import { prisma } from "../db/prisma.js";

export const productService = {
  list() {
    return prisma.product.findMany({
      include: { lender: true },
    });
  },

  get(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { lender: true },
    });
  },

  create(data: any) {
    return prisma.product.create({ data });
  },

  update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.product.delete({ where: { id } });
  },
};
