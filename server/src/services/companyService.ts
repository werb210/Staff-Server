import { prisma } from "../db/prisma.js";

export const companyService = {
  list() {
    return prisma.company.findMany({ include: { contacts: true } });
  },

  get(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: { contacts: true },
    });
  },

  create(data: any) {
    return prisma.company.create({ data });
  },

  update(id: string, data: any) {
    return prisma.company.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.company.delete({ where: { id } });
  },
};
