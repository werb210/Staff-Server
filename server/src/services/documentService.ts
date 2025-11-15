import { db } from "../db.js";
import { uuid } from "../utils/uuid.js";
import type { DocumentRecord, Silo } from "../types/documents.js";

export const documentService = {
  list(appId: string, silo: Silo): DocumentRecord[] {
    return db.documents[silo]?.data.filter(d => d.applicationId === appId) ?? [];
  },

  get(id: string, silo: Silo): DocumentRecord | null {
    return db.documents[silo]?.data.find(d => d.id === id) ?? null;
  },

  create(silo: Silo, data: Omit<DocumentRecord,"id"|"createdAt"|"updatedAt">): DocumentRecord {
    const record: DocumentRecord = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      silo
    };
    db.documents[silo].data.push(record);
    return record;
  },

  update(silo: Silo, id: string, patch: Partial<DocumentRecord>): DocumentRecord | null {
    const table = db.documents[silo];
    const index = table.data.findIndex(d => d.id === id);
    if (index === -1) return null;
    table.data[index] = {
      ...table.data[index],
      ...patch,
      updatedAt: new Date()
    };
    return table.data[index];
  }
};
