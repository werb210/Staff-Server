import { createHash, randomUUID } from "crypto";
import { gzipSync } from "zlib";
import type { Express } from "express";
import type { Document } from "@prisma/client";
import {
  prisma,
  requireUserSiloAccess,
  type Silo,
  type UserContext,
} from "./prisma.js";

export interface DownloadedDocument {
  buffer: Buffer;
  mimeType: string;
  name: string;
}

const documentStorage = new Map<string, DownloadedDocument>();

export const documentService = {
  async upload(
    user: UserContext,
    silo: Silo,
    appId: string,
    file: Express.Multer.File
  ): Promise<Document> {
    requireUserSiloAccess(user.silos, silo);

    if (!user.id) throw new Error("Missing user id for document upload");

    const application = await prisma.application.findFirst({
      where: { id: appId, silo },
    });
    if (!application) {
      throw new Error("Application not found for document upload");
    }

    const checksum = createHash("sha256").update(file.buffer).digest("hex");

    const created = await prisma.document.create({
      data: {
        applicationId: appId,
        silo,
        name: file.originalname,
        category: file.fieldname && file.fieldname !== "file"
          ? file.fieldname
          : null,
        mimeType: file.mimetype || "application/octet-stream",
        sizeBytes: file.size,
        s3Key: `memory://${randomUUID()}`,
        checksum,
        userId: user.id,
      },
    });

    documentStorage.set(created.id, {
      buffer: file.buffer,
      mimeType: created.mimeType,
      name: created.name,
    });

    return created;
  },

  async get(
    user: UserContext,
    silo: Silo,
    id: string
  ): Promise<Document | null> {
    const doc = await prisma.document.findFirst({ where: { id, silo } });
    if (!doc) return null;

    requireUserSiloAccess(user.silos, doc.silo);
    return doc;
  },

  async download(
    user: UserContext,
    silo: Silo,
    id: string
  ): Promise<DownloadedDocument | null> {
    const doc = await this.get(user, silo, id);
    if (!doc) return null;

    const stored = documentStorage.get(id);
    if (!stored) {
      return {
        buffer: Buffer.alloc(0),
        mimeType: doc.mimeType,
        name: doc.name,
      };
    }

    return stored;
  },

  async accept(
    user: UserContext,
    silo: Silo,
    id: string,
    reviewerId: string
  ): Promise<Document | null> {
    return this.updateStatus(user, silo, id, reviewerId, "ACCEPTED");
  },

  async reject(
    user: UserContext,
    silo: Silo,
    id: string,
    reviewerId: string
  ): Promise<Document | null> {
    return this.updateStatus(user, silo, id, reviewerId, "REJECTED");
  },

  async downloadAll(
    user: UserContext,
    silo: Silo,
    appId: string
  ): Promise<{ zipBuffer: Buffer; fileName: string } | null> {
    requireUserSiloAccess(user.silos, silo);

    const documents = await prisma.document.findMany({
      where: { applicationId: appId, silo },
      orderBy: { createdAt: "asc" },
    });

    if (!documents.length) return null;

    const archivePayload = JSON.stringify(
      documents.map((doc: Document) => ({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        status: doc.status,
        checksum: doc.checksum,
      })),
      null,
      2
    );

    const zipBuffer = gzipSync(Buffer.from(archivePayload, "utf8"));

    return {
      zipBuffer,
      fileName: `documents-${appId}.zip`,
    };
  },

  async updateStatus(
    user: UserContext,
    silo: Silo,
    id: string,
    reviewerId: string,
    status: "ACCEPTED" | "REJECTED"
  ): Promise<Document | null> {
    requireUserSiloAccess(user.silos, silo);

    const existing = await prisma.document.findFirst({ where: { id, silo } });
    if (!existing) return null;

    return prisma.document.update({
      where: { id },
      data: {
        status,
        userId: reviewerId,
      },
    });
  },
};
