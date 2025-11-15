import { db } from "../db.js";
import { uuid } from "../utils/uuid.js";
import type { ApplicationRecord, Silo } from "../../types/application.js";

export const applicationService = {
  list(silo: Silo): ApplicationRecord[] {
    return db.applications[silo]?.data ?? [];
  },

  get(silo: Silo, id: string): ApplicationRecord | null {
    return db.applications[silo]?.data.find(a => a.id === id) ?? null;
  },

  create(silo: Silo, data: Omit<ApplicationRecord,"id"|"createdAt"|"updatedAt">): ApplicationRecord {
    const record: ApplicationRecord = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      silo,
    };
    db.applications[silo].data.push(record);
    return record;
  },

  update(silo: Silo, id: string, patch: Partial<ApplicationRecord>): ApplicationRecord | null {
    const table = db.applications[silo];
    const index = table.data.findIndex(a => a.id === id);
    if (index === -1) return null;
    table.data[index] = {
      ...table.data[index],
      ...patch,
      updatedAt: new Date()
    };
    return table.data[index];
  },

  delete(silo: Silo, id: string): boolean {
    const table = db.applications[silo];
    const before = table.data.length;
    table.data = table.data.filter(a => a.id !== id);
    return table.data.length < before;
  }
};
