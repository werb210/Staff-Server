import { db } from "../db.js";
import { uuid } from "../utils/uuid.js";
import type { DocumentRecord, Silo } from "../types/index.js";

type DocumentCreateInput = {
  applicationId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
} & Partial<
  Omit<
    DocumentRecord,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "silo"
    | "applicationId"
    | "name"
    | "mimeType"
    | "sizeBytes"
  >
>;

export const documentService = {
  list(appId: string, silo: Silo): DocumentRecord[] {
    return db.documents[silo]?.data.filter(d => d.applicationId === appId) ?? [];
  },

  get(id: string, silo: Silo): DocumentRecord | null {
    return db.documents[silo]?.data.find(d => d.id === id) ?? null;
  },

  create(silo: Silo, data: DocumentCreateInput): DocumentRecord {
    const { applicationId, name, mimeType, sizeBytes, ...rest } = data;

    const record: DocumentRecord = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      applicationId,
      name,
      mimeType,
      sizeBytes,
      silo,
      ...rest,
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
