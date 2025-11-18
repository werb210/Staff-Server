import { prisma } from "../db/prisma.js";
import { v4 as uuid } from "uuid";

export const pipelineService = {
  list() {
    return prisma.pipelineItem.findMany({
      include: { application: true },
    });
  },

  get(id: string) {
    return prisma.pipelineItem.findUnique({
      where: { id },
      include: { application: true },
    });
  },

  create(data: any) {
    return prisma.pipelineItem.create({
      data: {
        id: uuid(),
        applicationId: data.applicationId,
        stage: data.stage,
        position: data.position ?? 0,
      },
    });
  },

  update(id: string, data: any) {
    return prisma.pipelineItem.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.pipelineItem.delete({ where: { id } });
  },
};
