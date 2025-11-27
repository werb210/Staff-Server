// server/src/services/documentsService.ts
import { prisma } from "../db/prisma";

const documentsService = {
  list() {
    return prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  get(id: string) {
    return prisma.application.findUnique({ where: { id } });
  },

  create(data: any) {
    return prisma.application.create({ data });
  },

  update(id: string, data: any) {
    return prisma.application.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.application.delete({ where: { id } });
  },
};

export { documentsService };
export default documentsService;
