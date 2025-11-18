// server/src/services/applicationsService.ts
import { prisma } from "../db/index.js";

export const applicationsService = {
  list() {
    return prisma.application.findMany({
      include: { company: true, user: true },
    });
  },

  get(id) {
    return prisma.application.findUnique({
      where: { id },
      include: { company: true, user: true },
    });
  },

  create(data) {
    return prisma.application.create({ data });
  },

  update(id, data) {
    return prisma.application.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.application.delete({ where: { id } });
  },
};
