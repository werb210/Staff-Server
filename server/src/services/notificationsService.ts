import prisma from "../db/prisma.js";

export const notificationsService = {
  async list() {
    return prisma.notification.findMany();
  },

  async get(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  async create(data: any) {
    return prisma.notification.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.notification.update({
      where: { id },
      data
    });
  },

  async remove(id: string) {
    return prisma.notification.delete({ where: { id } });
  }
};

export default notificationsService;
