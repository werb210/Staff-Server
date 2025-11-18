import { prisma } from "../db/index.js";

export const applicationService = {
  getById(id: string) {
    return prisma.application.findUnique({
      where: { id },
    });
  },

  create(data: any) {
    return prisma.application.create({ data });
  },

  update(id: string, data: any) {
    return prisma.application.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.application.delete({
      where: { id },
    });
  },
};

export default applicationService;
