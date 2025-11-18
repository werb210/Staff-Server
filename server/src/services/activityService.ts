import { prisma } from "../db/index.js";

export const activityService = {
  listByApplication(applicationId: string) {
    return prisma.activity.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  },

  create(applicationId: string, userId: string, action: string, details?: any) {
    return prisma.activity.create({
      data: { applicationId, userId, action, details },
    });
  },
};

export default activityService;
