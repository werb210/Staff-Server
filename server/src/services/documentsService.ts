import { v4 as uuid } from "uuid";
import documentsRepo from "../db/repositories/documents.repo.js";

export interface DocumentRecord {
  id: string;
  applicationId: string | null;
  name: string;
  url: string;
  mimeType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentCreateInput {
  applicationId?: string;
  name: string;
  url: string;
  mimeType?: string | null;
}

const mapDocument = (doc: any): DocumentRecord | null => {
  if (!doc) return null;
  return {
    id: doc.id,
    applicationId: doc.applicationId ?? null,
    name: doc.name,
    url: doc.azureBlobKey,
    mimeType: doc.mimeType ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const documentsService = {
  async list(): Promise<DocumentRecord[]> {
    const docs = await documentsRepo.findMany();
    return (docs as any[]).map(mapDocument).filter(Boolean) as DocumentRecord[];
  },

  async get(id: string): Promise<DocumentRecord | null> {
    const doc = await documentsRepo.findById(id);
    return mapDocument(doc);
  },

  async create(data: DocumentCreateInput): Promise<DocumentRecord> {
    const documentId = uuid();
    const created = await documentsRepo.create({
      id: documentId,
      applicationId: data.applicationId ?? "",
      name: data.name,
      mimeType: data.mimeType ?? "application/octet-stream",
      azureBlobKey: data.url,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return mapDocument(created)!;
  },

  async update(id: string, data: Partial<DocumentCreateInput>): Promise<DocumentRecord> {
    const updated = await documentsRepo.update(id, {
      name: data.name,
      mimeType: data.mimeType ?? undefined,
      azureBlobKey: data.url,
      updatedAt: new Date(),
    });
    return mapDocument(updated)!;
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    await documentsRepo.delete(id);
    return { deleted: true };
  },
};
