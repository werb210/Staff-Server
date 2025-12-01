import documentsRepo from "../db/repositories/documents.repo.js";
import documentVersionsRepo from "../db/repositories/documentVersions.repo.js";

export interface DocumentRecord {
  id: string;
  applicationId: string;
  name: string;
  category?: string | null;
  azureBlobKey: string;
  mimeType: string;
  checksum?: string | null;
  sizeBytes?: number | null;
  status: string;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentCreateInput {
  applicationId: string;
  name: string;
  azureBlobKey: string;
  mimeType?: string | null;
  category?: string | null;
  checksum?: string | null;
  sizeBytes?: number | null;
  status?: string;
  rejectionReason?: string | null;
}

const mapDocument = (doc: any): DocumentRecord | null => {
  if (!doc) return null;
  return {
    id: doc.id,
    applicationId: doc.applicationId,
    name: doc.name,
    category: doc.category ?? null,
    azureBlobKey: doc.azureBlobKey,
    mimeType: doc.mimeType,
    checksum: doc.checksum ?? null,
    sizeBytes: doc.sizeBytes ?? null,
    status: doc.status,
    rejectionReason: doc.rejectionReason ?? null,
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
    const created = await documentsRepo.create({
      applicationId: data.applicationId,
      name: data.name,
      category: data.category ?? null,
      mimeType: data.mimeType ?? "application/octet-stream",
      azureBlobKey: data.azureBlobKey,
      checksum: data.checksum ?? null,
      sizeBytes: data.sizeBytes ?? null,
      status: data.status ?? "pending",
      rejectionReason: data.rejectionReason ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return mapDocument(created)!;
  },

  async update(id: string, data: Partial<DocumentCreateInput>): Promise<DocumentRecord> {
    const existing = await documentsRepo.findById(id);
    if (!existing) {
      throw new Error("Document not found.");
    }

    const priorVersions = await documentVersionsRepo.findMany({ documentId: id });
    await documentVersionsRepo.create({
      documentId: id,
      versionNumber: priorVersions.length + 1,
      azureBlobKey: existing.azureBlobKey,
      checksum: existing.checksum,
      sizeBytes: existing.sizeBytes,
    });

    const updated = await documentsRepo.update(id, {
      name: data.name ?? undefined,
      category: data.category ?? undefined,
      mimeType: data.mimeType ?? undefined,
      azureBlobKey: data.azureBlobKey ?? undefined,
      checksum: data.checksum ?? undefined,
      sizeBytes: data.sizeBytes ?? undefined,
      status: data.status ?? undefined,
      rejectionReason: data.rejectionReason ?? undefined,
      updatedAt: new Date(),
    });
    return mapDocument(updated)!;
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    await documentsRepo.delete(id);
    return { deleted: true };
  },
};
