import { v4 as uuid } from "uuid";
import auditLogsRepo from "../db/repositories/auditLogs.repo.js";

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

const mapDeal = (record: any): DealRecord | null => {
  if (!record || record.eventType !== "deal") return null;
  const details = record.details ?? {};
  return {
    id: record.id,
    applicationId: details.applicationId,
    lenderId: details.lenderId,
    status: details.status,
    offerAmount: details.offerAmount,
    terms: details.terms ?? null,
  } as DealRecord;
};

export const dealsService = {
  async list(): Promise<DealWithApplication[]> {
    const records = await auditLogsRepo.findMany({ eventType: "deal" } as any);
    return (records as any[]).map(mapDeal).filter(Boolean) as DealWithApplication[];
  },

  async get(id: string): Promise<DealWithApplication | null> {
    const record = await auditLogsRepo.findById(id);
    return mapDeal(record) as DealWithApplication | null;
  },

  async create(data: DealCreateInput): Promise<DealRecord> {
    const payload = {
      applicationId: data.applicationId,
      lenderId: data.lenderId,
      status: data.status,
      offerAmount: data.offerAmount,
      terms: data.terms ?? null,
    };

    const created = await auditLogsRepo.create({
      id: uuid(),
      eventType: "deal",
      details: payload,
    } as any);

    return mapDeal(created)!;
  },

  async update(id: string, data: DealUpdateInput): Promise<DealRecord> {
    const existing = await auditLogsRepo.findById(id);
    const details = { ...(existing as any)?.details, ...data };
    const updated = await auditLogsRepo.update(id, { details } as any);
    return mapDeal(updated)!;
  },

  async remove(id: string): Promise<DealRecord> {
    const deleted = await auditLogsRepo.delete(id);
    return mapDeal(deleted)!;
  },
};
