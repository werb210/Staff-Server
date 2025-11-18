import prisma from "../db/prisma.js";

export const communicationService = {
  async list() {
    return prisma.communication.findMany();
  },

  async get(id: string) {
    return prisma.communication.findUnique({ where: { id } });
  },

  async create(data: any) {
    return prisma.communication.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.communication.update({ where: { id }, data });
  },

  async remove(id: string) {
    return prisma.communication.delete({ where: { id } });
  }
};

export default communicationService;
