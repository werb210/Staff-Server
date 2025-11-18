import { prisma } from "../db/index.js";

export const activityTimelineService = {
  list(applicationId: string) {
    return prisma.activityTimeline.findMany({
      where: { applicationId },
      orderBy: { timestamp: "desc" },
    });
  },

  addEvent(applicationId: string, type: string, payload: any) {
    return prisma.activityTimeline.create({
      data: { applicationId, type, payload },
    });
  },
};

export default activityTimelineService;
