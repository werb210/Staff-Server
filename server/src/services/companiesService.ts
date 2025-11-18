// server/src/services/companiesService.ts
import { prisma } from "../db/index.js";

export const companiesService = {
  list() {
    return prisma.company.findMany({
      include: { contacts: true, applications: true },
    });
  },

  get(id) {
    return prisma.company.findUnique({
      where: { id },
      include: { contacts: true, applications: true },
    });
  },

  create(data) {
    return prisma.company.create({ data });
  },

  update(id, data) {
    return prisma.company.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.company.delete({ where: { id } });
  },
};
