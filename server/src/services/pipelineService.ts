import prisma from "../db/prisma.js";

export const pipelineService = {
  async list() {
    return prisma.pipelineStage.findMany({
      orderBy: { order: "asc" }
    });
  },

  async get(id: string) {
    return prisma.pipelineStage.findUnique({ where: { id } });
  },

  async moveApplication(appId: string, stageId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { stageId }
    });
  }
};

export default pipelineService;
