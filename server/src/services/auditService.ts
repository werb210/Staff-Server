import { prisma } from "../db/index.js";

export const auditService = {
  log(entity: string, entityId: string, userId: string, change: any) {
    return prisma.systemAudit.create({
      data: { entity, entityId, userId, change },
    });
  },

  list(entity: string, entityId: string) {
    return prisma.systemAudit.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: "desc" },
    });
  },
};

export default auditService;
