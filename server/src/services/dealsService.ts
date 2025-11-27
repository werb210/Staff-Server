// server/src/services/dealsService.ts
import { prisma } from "../db/prisma";

const dealsService = {
  list() {
    return prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  get(id: string) {
    return prisma.deal.findUnique({ where: { id } });
  },

  create(data: any) {
    return prisma.deal.create({ data });
  },

  update(id: string, data: any) {
    return prisma.deal.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.deal.delete({ where: { id } });
  },
};

export { dealsService };
export default dealsService;
