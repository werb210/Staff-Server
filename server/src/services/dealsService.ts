import { v4 as uuid } from "uuid";

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

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
    return prismaRemoved();
  },

  get(id: string): Promise<DealWithApplication | null> {
    return prismaRemoved();
  },

  create(data: DealCreateInput): Promise<DealRecord> {
    return prismaRemoved();
  },

  update(id: string, data: DealUpdateInput): Promise<DealRecord> {
    return prismaRemoved();
  },

  remove(id: string): Promise<DealRecord> {
    return prismaRemoved();
  },
};
