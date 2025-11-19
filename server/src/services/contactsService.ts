// server/src/services/contactsService.ts
import type { Contact, Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";

type ContactWithRelations = Prisma.ContactGetPayload<{
  include: { company: true; user: true };
}>;

export const contactsService = {
  list(): Promise<ContactWithRelations[]> {
    return prisma.contact.findMany({ include: { company: true, user: true } });
  },

  get(id: string): Promise<ContactWithRelations | null> {
    return prisma.contact.findUnique({
      where: { id },
      include: { company: true, user: true },
    });
  },

  create(data: Prisma.ContactUncheckedCreateInput): Promise<Contact> {
    return prisma.contact.create({ data }) as Promise<Contact>;
  },

  update(
    id: string,
    data: Prisma.ContactUncheckedUpdateInput,
  ): Promise<Contact> {
    return prisma.contact.update({ where: { id }, data }) as Promise<Contact>;
  },

  delete(id: string): Promise<Contact> {
    return prisma.contact.delete({ where: { id } }) as Promise<Contact>;
  },
};
