// server/src/services/companiesService.ts
import type { Company, Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";

type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: { contacts: true; applications: true };
}>;

export const companiesService = {
  list(): Promise<CompanyWithRelations[]> {
    return prisma.company.findMany({
      include: { contacts: true, applications: true },
    });
  },

  get(id: string): Promise<CompanyWithRelations | null> {
    return prisma.company.findUnique({
      where: { id },
      include: { contacts: true, applications: true },
    });
  },

  create(data: Prisma.CompanyUncheckedCreateInput): Promise<Company> {
    return prisma.company.create({ data }) as Promise<Company>;
  },

  update(
    id: string,
    data: Prisma.CompanyUncheckedUpdateInput,
  ): Promise<Company> {
    return prisma.company.update({ where: { id }, data }) as Promise<Company>;
  },

  delete(id: string): Promise<Company> {
    return prisma.company.delete({ where: { id } }) as Promise<Company>;
  },
};
