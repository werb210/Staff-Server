import { prisma } from "../db/prisma.js";

export const contactService = {
  list() {
    return prisma.contact.findMany({ include: { company: true } });
  },

  get(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: { company: true },
    });
  },

  create(data: any) {
    return prisma.contact.create({ data });
  },

  update(id: string, data: any) {
    return prisma.contact.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.contact.delete({ where: { id } });
  },
};
