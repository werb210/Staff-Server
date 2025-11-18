import { prisma } from "../db/index.js";

export const applicationStatusService = {
  update(applicationId: string, newStatus: string) {
    return prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });
  },

  history(applicationId: string) {
    return prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  },

  logStatus(applicationId: string, status: string) {
    return prisma.applicationStatusHistory.create({
      data: { applicationId, status },
    });
  },
};

export default applicationStatusService;
