import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { v4 as uuid } from "uuid";

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

const mapDocument = (row: DocumentRecord): DocumentRecord => ({ ...row });

const selectColumns = Prisma.sql`
  id,
  application_id AS "applicationId",
  name,
  url,
  mime_type AS "mimeType",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const tableName = Prisma.sql`documents`;

const handleError = (error: unknown, action: string): never => {
  if (error instanceof Error) {
    throw new Error(`${action}: ${error.message}`);
  }
  throw new Error(action);
};

export const documentsService = {
  async list(): Promise<DocumentRecord[]> {
    try {
      const rows = await prisma.$queryRaw<DocumentRecord[]>(
        Prisma.sql`SELECT ${selectColumns} FROM ${tableName} ORDER BY created_at DESC`,
      );
      return rows.map(mapDocument);
    } catch (error) {
      handleError(error, "Failed to list documents");
    }
  },

  async get(id: string): Promise<DocumentRecord | null> {
    try {
      const rows = await prisma.$queryRaw<DocumentRecord[]>(
        Prisma.sql`SELECT ${selectColumns} FROM ${tableName} WHERE id = ${id} LIMIT 1`,
      );
      return rows[0] ? mapDocument(rows[0]) : null;
    } catch (error) {
      handleError(error, `Failed to fetch document ${id}`);
    }
  },

  async create(data: DocumentCreateInput): Promise<DocumentRecord> {
    const documentId = uuid();
    const { applicationId = null, name, url, mimeType = null } = data;

    try {
      const rows = await prisma.$queryRaw<DocumentRecord[]>(
        Prisma.sql`
          INSERT INTO ${tableName} (id, application_id, name, url, mime_type)
          VALUES (${documentId}, ${applicationId}, ${name}, ${url}, ${mimeType})
          RETURNING ${selectColumns}
        `,
      );
      return mapDocument(rows[0]);
    } catch (error) {
      handleError(error, "Failed to create document");
    }
  },

  async update(id: string, data: Partial<DocumentCreateInput>): Promise<DocumentRecord> {
    const updates: Prisma.Sql[] = [];

    if (data.name !== undefined) updates.push(Prisma.sql`name = ${data.name}`);
    if (data.url !== undefined) updates.push(Prisma.sql`url = ${data.url}`);
    if (data.mimeType !== undefined) updates.push(Prisma.sql`mime_type = ${data.mimeType}`);
    if (data.applicationId !== undefined)
      updates.push(Prisma.sql`application_id = ${data.applicationId}`);

    if (updates.length === 0) {
      throw new Error("No update fields provided");
    }

    try {
      const rows = await prisma.$queryRaw<DocumentRecord[]>(
        Prisma.sql`
          UPDATE ${tableName}
          SET ${Prisma.join(updates, Prisma.sql`, `)}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING ${selectColumns}
        `,
      );
      if (!rows[0]) {
        throw new Error("Document not found");
      }
      return mapDocument(rows[0]);
    } catch (error) {
      handleError(error, `Failed to update document ${id}`);
    }
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    try {
      const result = await prisma.$executeRaw<number>(
        Prisma.sql`DELETE FROM ${tableName} WHERE id = ${id}`,
      );
      return { deleted: result > 0 };
    } catch (error) {
      handleError(error, `Failed to delete document ${id}`);
    }
  },
};
