import { prisma } from "../db/index.js";

export const applicationAuditService = {
  list(applicationId: string) {
    return prisma.applicationAudit.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  },

  record(applicationId: string, userId: string, change: any) {
    return prisma.applicationAudit.create({
      data: { applicationId, userId, change },
    });
  },
};

export default applicationAuditService;
