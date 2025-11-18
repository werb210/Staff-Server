import { prisma } from "../db/index.js";

export const auditLogService = {
  list() {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  record(userId: string, action: string, meta?: any) {
    return prisma.auditLog.create({
      data: { userId, action, meta },
    });
  },
};

export default auditLogService;
