// server/src/services/lendersService.ts
import { prisma } from "../db/prisma";

const lendersService = {
  list() {
    return prisma.lender.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  get(id: string) {
    return prisma.lender.findUnique({ where: { id } });
  },

  create(data: any) {
    return prisma.lender.create({ data });
  },

  update(id: string, data: any) {
    return prisma.lender.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.lender.delete({ where: { id } });
  },
};

export { lendersService };
export default lendersService;
