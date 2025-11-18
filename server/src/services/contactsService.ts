import { prisma } from "../db/prisma.js";
import { v4 as uuid } from "uuid";

export const contactsService = {
  list() {
    return prisma.contact.findMany();
  },

  get(id: string) {
    return prisma.contact.findUnique({ where: { id } });
  },

  create(data: any) {
    return prisma.contact.create({
      data: {
        id: uuid(),
        companyId: data.companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
      },
    });
  },

  update(id: string, data: any) {
    return prisma.contact.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.contact.delete({ where: { id } });
  },
};
