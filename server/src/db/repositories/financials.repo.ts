import { randomUUID } from "crypto";

type FinancialRecord = {
  id: string;
  applicationId: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
};

const financials = new Map<string, FinancialRecord>();

export const financialsRepo = {
  async save(applicationId: string, data: any) {
    const existing = financials.get(applicationId);
    const now = new Date();
    const record: FinancialRecord = existing
      ? { ...existing, data, updatedAt: now }
      : {
          id: randomUUID(),
          applicationId,
          data,
          createdAt: now,
          updatedAt: now
        };

    financials.set(applicationId, record);
    return record;
  },

  async findByApplication(applicationId: string) {
    return financials.get(applicationId) ?? null;
  }
};

export default financialsRepo;
