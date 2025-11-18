import { prisma } from "../db/index.js";

export const applicationsService = {
  listAll() {
    return prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  listByStatus(status: string) {
    return prisma.application.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  },
};

export default applicationsService;
