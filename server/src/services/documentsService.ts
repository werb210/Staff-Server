// server/src/services/documentsService.ts
import { prisma } from "../db/prisma";

const documentsService = {
  list() {
    return prisma.document.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  get(id: string) {
    return prisma.document.findUnique({ where: { id } });
  },

  create(data: any) {
    return prisma.document.create({ data });
  },

  update(id: string, data: any) {
    return prisma.document.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.document.delete({ where: { id } });
  },
};

export { documentsService };
export default documentsService;
