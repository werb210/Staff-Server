import { v4 as uuid } from "uuid";

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

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
  applicationId?: string | null;
  name: string;
  url: string;
  mimeType?: string | null;
}

export const documentsService = {
  async list(): Promise<DocumentRecord[]> {
    return prismaRemoved();
  },

  async get(id: string): Promise<DocumentRecord | null> {
    return prismaRemoved();
  },

  async create(data: DocumentCreateInput): Promise<DocumentRecord> {
    const documentId = uuid();
    return prismaRemoved();
  },

  async update(id: string, data: Partial<DocumentCreateInput>): Promise<DocumentRecord> {
    return prismaRemoved();
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    return prismaRemoved();
  },
};
