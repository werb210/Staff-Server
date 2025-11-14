import crypto from "crypto";
import type { Express } from "express";
import {
  PrismaClient,
  Prisma,
  type Application,
  type Document as DocumentModel,
  type DocumentVersion as DocumentVersionModel,
  type Silo,
  DocumentStatus,
} from "@prisma/client";

import {
  downloadBufferFromAzure,
  generateDownloadSasUrl,
  generateUploadSasUrl,
  getBlobUrl,
  uploadBufferToAzure,
} from "./azureBlob.js";

const prisma = new PrismaClient();

type AllowedSilos = readonly Silo[] | readonly string[];

type DocumentWithRelations = DocumentModel & {
  application: Pick<Application, "silo">;
  versions: DocumentVersionModel[];
};

const sha256 = (buffer: Buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const ensureSiloAccess = (silos: AllowedSilos, silo: Silo) =>
  silos.includes(silo);

const mapVersion = (version: DocumentVersionModel) => ({
  version: version.version,
  uploadedAt: version.createdAt.toISOString(),
  checksum: version.checksum,
  blobUrl: version.blobUrl,
  sasUrl: null as string | null,
  uploadedBy: version.uploadedBy ?? null,
  note: version.note ?? null,
});

const mapDocument = (document: DocumentWithRelations) => {
  const sortedVersions = [...document.versions].sort((a, b) => b.version - a.version);
  return {
    id: document.id,
    applicationId: document.applicationId,
    documentType: document.documentType ?? null,
    status: document.status.toUpperCase(),
    uploadedAt: sortedVersions[0]?.createdAt.toISOString() ?? document.createdAt.toISOString(),
    uploadedBy: document.uploadedBy ?? sortedVersions[0]?.uploadedBy ?? null,
    note: document.note ?? sortedVersions[0]?.note ?? null,
    version: document.version,
    fileName: document.fileName,
    checksum: document.checksum,
    blobUrl: document.blobUrl,
    sasUrl: null as string | null,
    aiSummary: document.aiSummary ?? null,
    explainability: document.explainability as Record<string, unknown> | null,
    sizeBytes: document.sizeBytes,
    versionHistory: sortedVersions.map(mapVersion),
  };
};

const fetchDocument = async (id: string): Promise<DocumentWithRelations | null> =>
  prisma.document.findUnique({
    where: { id },
    include: { application: { select: { silo: true } }, versions: true },
  });

const fetchDocuments = async (where: Prisma.DocumentWhereInput) =>
  prisma.document.findMany({
    where,
    include: { application: { select: { silo: true } }, versions: true },
    orderBy: { updatedAt: "desc" },
  });

const ensureApplicationAccess = async (
  appId: string,
  allowedSilos: AllowedSilos,
): Promise<Application | null> => {
  const application = await prisma.application.findUnique({ where: { id: appId } });
  if (!application) return null;
  if (!ensureSiloAccess(allowedSilos, application.silo)) return null;
  return application;
};

const upsertDocumentVersion = async (
  payload: {
    id: string;
    applicationId: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
    documentType?: string;
    note?: string;
    uploadedBy?: string;
  },
  allowedSilos: AllowedSilos,
) => {
  const application = await ensureApplicationAccess(payload.applicationId, allowedSilos);
  if (!application) return null;

  const checksum = sha256(payload.buffer);
  const sizeBytes = payload.buffer.length;

  const existing = await fetchDocument(payload.id);
  if (existing && existing.applicationId !== payload.applicationId) {
    throw new Error("Document application mismatch");
  }

  const nextVersion = existing ? existing.version + 1 : 1;
  const blobPath = `applications/${payload.applicationId}/${payload.id}/v${nextVersion}-${Date.now()}-${payload.fileName}`;
  const blobUrl = await uploadBufferToAzure(payload.buffer, blobPath, payload.contentType);

  const versionData = {
    documentId: payload.id,
    version: nextVersion,
    fileName: payload.fileName,
    mimeType: payload.contentType,
    sizeBytes,
    checksum,
    blobPath,
    blobUrl,
    uploadedBy: payload.uploadedBy,
    note: payload.note,
  } satisfies Parameters<typeof prisma.documentVersion.create>[0]["data"];

  if (!existing) {
    await prisma.document.create({
      data: {
        id: payload.id,
        applicationId: payload.applicationId,
        documentType: payload.documentType,
        fileName: payload.fileName,
        mimeType: payload.contentType,
        sizeBytes,
        checksum,
        blobPath,
        blobUrl,
        status: DocumentStatus.pending,
        version: nextVersion,
        uploadedBy: payload.uploadedBy,
        note: payload.note,
      },
    });
  } else {
    await prisma.document.update({
      where: { id: payload.id },
      data: {
        documentType: payload.documentType ?? existing.documentType,
        fileName: payload.fileName,
        mimeType: payload.contentType,
        sizeBytes,
        checksum,
        blobPath,
        blobUrl,
        version: nextVersion,
        uploadedBy: payload.uploadedBy ?? existing.uploadedBy,
        note: payload.note ?? existing.note,
      },
    });
  }

  await prisma.documentVersion.create({ data: versionData });

  const updated = await fetchDocument(payload.id);
  return updated ? mapDocument(updated) : null;
};

export const listDocuments = async (
  allowedSilos: AllowedSilos,
  applicationId?: string,
) => {
  const where: Prisma.DocumentWhereInput = {
    ...(applicationId ? { applicationId } : {}),
    application: { silo: { in: allowedSilos as Silo[] } },
  };

  const documents = await fetchDocuments(where);
  return documents.map(mapDocument);
};

export const getDocument = async (id: string, allowedSilos: AllowedSilos) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;
  return mapDocument(document);
};

export const uploadDocumentFromFile = async (
  appId: string,
  file: Express.Multer.File,
  allowedSilos: AllowedSilos,
) =>
  upsertDocumentVersion(
    {
      id: crypto.randomUUID(),
      applicationId: appId,
      fileName: file.originalname,
      contentType: file.mimetype,
      buffer: file.buffer,
    },
    allowedSilos,
  );

export const registerDocumentFromPayload = async (
  payload: {
    id: string;
    applicationId: string;
    fileName: string;
    fileContent: string;
    contentType?: string;
    note?: string;
    uploadedBy?: string;
    documentType?: string;
  },
  allowedSilos: AllowedSilos,
) => {
  const dataPart = payload.fileContent.includes(",")
    ? payload.fileContent.split(",", 2)[1]
    : payload.fileContent;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataPart, "base64");
    if (buffer.length === 0) {
      buffer = Buffer.from(payload.fileContent);
    }
  } catch (error) {
    buffer = Buffer.from(payload.fileContent);
  }

  return upsertDocumentVersion(
    {
      id: payload.id,
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      contentType: payload.contentType ?? "application/octet-stream",
      buffer,
      note: payload.note,
      uploadedBy: payload.uploadedBy,
      documentType: payload.documentType,
    },
    allowedSilos,
  );
};

export const getDocumentsForApplication = async (
  appId: string,
  allowedSilos: AllowedSilos,
) => {
  const documents = await listDocuments(allowedSilos, appId);
  return documents.length ? documents : null;
};

export const downloadDocument = async (
  id: string,
  allowedSilos: AllowedSilos,
  version?: number,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  const record = version
    ? document.versions.find((entry) => entry.version === version)
    : [...document.versions].sort((a, b) => b.version - a.version)[0];

  if (!record) return null;

  const buffer = await downloadBufferFromAzure(record.blobPath);
  return {
    document: mapDocument(document),
    version: record.version,
    buffer,
    mimeType: record.mimeType,
    fileName: record.fileName,
  };
};

export const getDocumentVersions = async (
  id: string,
  allowedSilos: AllowedSilos,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  return [...document.versions]
    .sort((a, b) => b.version - a.version)
    .map((version) => ({
      ...mapVersion(version),
      sasUrl: (() => {
        try {
          return generateDownloadSasUrl(version.blobPath);
        } catch (error) {
          return null;
        }
      })(),
    }));
};

export const updateDocumentStatus = async (
  id: string,
  status: DocumentModel["status"],
  allowedSilos: AllowedSilos,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  const updated = await prisma.document.update({
    where: { id },
    data: { status },
    include: { application: { select: { silo: true } }, versions: true },
  });

  return mapDocument(updated);
};

export const getDocumentStatus = async (
  id: string,
  allowedSilos: AllowedSilos,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  return {
    id: document.id,
    status: document.status.toUpperCase(),
    version: document.version,
    lastUpdatedAt: document.updatedAt.toISOString(),
  };
};

export const getDownloadUrl = async (
  id: string,
  allowedSilos: AllowedSilos,
  version?: number,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  const record = version
    ? document.versions.find((entry) => entry.version === version)
    : [...document.versions].sort((a, b) => b.version - a.version)[0];

  if (!record) return null;

  try {
    const sasUrl = generateDownloadSasUrl(record.blobPath);
    return { sasUrl, version: record.version };
  } catch (error) {
    return { sasUrl: getBlobUrl(record.blobPath), version: record.version };
  }
};

export const getUploadUrl = async (
  id: string,
  allowedSilos: AllowedSilos,
) => {
  const document = await fetchDocument(id);
  if (!document) return null;
  if (!ensureSiloAccess(allowedSilos, document.application.silo)) return null;

  try {
    const sasUrl = generateUploadSasUrl(document.blobPath);
    return { uploadUrl: sasUrl, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
  } catch (error) {
    return {
      uploadUrl: document.blobUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
};
