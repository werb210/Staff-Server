import { prisma } from "../db/prisma.js";
import { v4 as uuid } from "uuid";

export interface DealRecord {
  id: string;
  applicationId: string;
  lenderId: string;
  status: string;
  offerAmount: number;
  terms: string | null;
}

export type DealWithApplication = DealRecord & {
  application?: Record<string, unknown> | null;
};

export type DealCreateInput = Omit<DealRecord, "id">;

export type DealUpdateInput = Partial<DealCreateInput>;

export const dealsService = {
  list(): Promise<DealWithApplication[]> {
    return prisma.deal.findMany({ include: { application: true } });
  },

  get(id: string): Promise<DealWithApplication | null> {
    return prisma.deal.findUnique({
      where: { id },
      include: { application: true },
    });
  },

  create(data: DealCreateInput): Promise<DealRecord> {
    return prisma.deal.create({
      data: {
        id: uuid(),
        applicationId: data.applicationId,
        lenderId: data.lenderId,
        status: data.status,
        offerAmount: data.offerAmount,
        terms: data.terms,
      },
    });
  },

  update(id: string, data: DealUpdateInput): Promise<DealRecord> {
    return prisma.deal.update({ where: { id }, data });
  },

  remove(id: string): Promise<DealRecord> {
    return prisma.deal.delete({ where: { id } });
  },
};
