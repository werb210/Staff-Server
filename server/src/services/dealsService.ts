import prisma from "../db/prisma.js";

export const dealsService = {
  async list() {
    return prisma.deal.findMany();
  },

  async get(id: string) {
    return prisma.deal.findUnique({ where: { id } });
  },

  async create(data: any) {
    return prisma.deal.create({ data });
  },

  async update(id: string, data: any) {
    return prisma.deal.update({ where: { id }, data });
  },

  async remove(id: string) {
    return prisma.deal.delete({ where: { id } });
  }
};

export default dealsService;
