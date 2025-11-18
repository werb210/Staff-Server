// server/src/services/usersService.ts
import { prisma } from "../db/index.js";

export const usersService = {
  list() {
    return prisma.user.findMany();
  },

  get(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data) {
    return prisma.user.create({ data });
  },

  update(id, data) {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.user.delete({ where: { id } });
  },
};
