#!/usr/bin/env bash
set -euo pipefail

cat > server/src/services/documentService.ts <<'EOF'
import { createHash, randomUUID } from "crypto";
import JSZip from "jszip";
import type { Response } from "express";

import {
  type Document,
  type DocumentStatus,
  type DocumentUploadMetadata,
  type DocumentWithVersions,
  DocumentSchema,
  DocumentUploadMetadataSchema,
  DocumentWithVersionsSchema,
  DocumentStatusSchema,
} from "../schemas/document.schema.js";

import {
  type DocumentVersion,
  DocumentVersionSchema,
} from "../schemas/documentVersion.schema.js";

import {
  uploadBuffer,
  downloadBuffer,
  streamBlob,
} from "./azureBlob.js";

/* In-memory store */
const documents = new Map<string, DocumentWithVersions>();

const now = (): string => new Date().toISOString();
const sanitizeName = (name: string): string =>
  name.trim().replace(/[^a-zA-Z0-9._-]/g, "-") || "document";
const sha256 = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");
const blobPath = (docId: string, version: number, fileName: string): string =>
  `${docId}/v${version}/${sanitizeName(fileName)}`;
const requireDoc = (id: string): DocumentWithVersions => {
  const record = documents.get(id);
  if (!record) throw new Error(`Document ${id} not found`);
  return record;
};
const storeDoc = (record: DocumentWithVersions): DocumentWithVersions => {
  const validated = DocumentWithVersionsSchema.parse(record);
  documents.set(validated.id, validated);
  return validated;
};

const buildVersion = (p: {
  documentId: string;
  blobName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  version: number;
  createdAt?: string;
}): DocumentVersion => {
  const v: DocumentVersion = {
    id: randomUUID(),
    documentId: p.documentId,
    blobName: p.blobName,
    mimeType: p.mimeType,
    fileSize: p.fileSize,
    checksum: p.checksum,
    version: p.version,
    createdAt: p.createdAt ?? now(),
  };
  return DocumentVersionSchema.parse(v);
};

/* CREATE NEW DOCUMENT */
export const saveNewDocument = async (
  meta: DocumentUploadMetadata,
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<DocumentWithVersions> => {
  const m = DocumentUploadMetadataSchema.parse(meta);
  const created = now();
  const id = randomUUID();

  const version = 1;
  const fileName = sanitizeName(originalName ?? m.name);
  const blobName = blobPath(id, version, fileName);

  await uploadBuffer(buffer, blobName, mimeType);
  const checksum = sha256(buffer);

  const base: DocumentWithVersions = {
    id,
    applicationId: m.applicationId,
    name: m.name,
    fileName,
    category: m.category,
    mimeType,
    blobName,
    fileSize: buffer.length,
    checksum,
    version,
    status: "pending",
    createdAt: created,
    updatedAt: created,
    ocrTextPreview: undefined,
    versions: [
      buildVersion({
        documentId: id,
        blobName,
        mimeType,
        fileSize: buffer.length,
        checksum,
        version,
        createdAt: created,
      }),
    ],
  };

  return storeDoc(base);
};

/* FETCH BY ID */
export const getDocumentById = (id: string): DocumentWithVersions =>
  DocumentWithVersionsSchema.parse(requireDoc(id));

/* SAVE NEW VERSION */
export const saveDocumentVersion = async (p: {
  documentId: string;
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  category?: Document["category"];
}): Promise<DocumentWithVersions> => {
  const record = requireDoc(p.documentId);

  const version = record.version + 1;
  const updated = now();
  const fileName = sanitizeName(p.fileName ?? record.fileName);
  const blobName = blobPath(record.id, version, fileName);

  await uploadBuffer(p.buffer, blobName, p.mimeType);
  const checksum = sha256(p.buffer);

  const versionObj = buildVersion({
    documentId: record.id,
    blobName,
    mimeType: p.mimeType,
    fileSize: p.buffer.length,
    checksum,
    version,
    createdAt: updated,
  });

  const merged: DocumentWithVersions = {
    ...record,
    name: fileName,
    fileName,
    category: p.category ?? record.category,
    mimeType: p.mimeType,
    blobName,
    fileSize: p.buffer.length,
    checksum,
    version,
    status: "pending",
    updatedAt: updated,
    versions: [...record.versions, versionObj],
    ocrTextPreview: record.ocrTextPreview,
  };

  return storeDoc(merged);
};

/* ACCEPT / REJECT */
export const acceptDocument = (id: string): DocumentWithVersions => {
  const doc = requireDoc(id);
  doc.status = "accepted";
  doc.updatedAt = now();
  return storeDoc(doc);
};
export const rejectDocument = (id: string): DocumentWithVersions => {
  const doc = requireDoc(id);
  doc.status = "rejected";
  doc.updatedAt = now();
  return storeDoc(doc);
};

/* REUPLOAD */
export const reuploadDocument = async (
  id: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  category?: Document["category"]
): Promise<DocumentWithVersions> =>
  saveDocumentVersion({ documentId: id, buffer, mimeType, fileName, category });

/* LIST FOR APPLICATION */
export const getDocumentsForApplication = (applicationId: string): Document[] =>
  Array.from(documents.values())
    .filter((doc) => doc.applicationId === applicationId)
    .map((doc) => DocumentSchema.parse({ ...doc }));

/* DOWNLOAD SINGLE DOCUMENT */
export const downloadDocument = async (
  id: string
): Promise<{ buffer: Buffer; document: DocumentWithVersions } | null> => {
  const doc = documents.get(id);
  if (!doc) return null;
  const buffer = await downloadBuffer(doc.blobName);
  return { buffer, document: doc };
};

/* DOWNLOAD MULTIPLE AS ZIP */
export const downloadMultipleDocuments = async (ids: string[]): Promise<Buffer> => {
  const zip = new JSZip();
  await Promise.all(
    ids.map(async (id) => {
      const doc = documents.get(id);
      if (!doc) return;
      const buffer = await downloadBuffer(doc.blobName);
      zip.file(`${sanitizeName(doc.name)}-v${doc.version}`, buffer);
    })
  );
  return zip.generateAsync({ type: "nodebuffer" });
};

/* STREAM DOCUMENT */
export const streamDocument = async (id: string, res: Response): Promise<void> => {
  const doc = requireDoc(id);
  await streamBlob(doc.blobName, res);
};

/* DELETE DOCUMENT */
export const deleteDocument = (id: string): DocumentWithVersions => {
  const doc = requireDoc(id);
  documents.delete(id);
  return doc;
};

/* DocumentService Class */
export class DocumentService {
  listDocuments(applicationId?: string): DocumentWithVersions[] {
    if (!applicationId) return Array.from(documents.values());
    return Array.from(documents.values()).filter(
      (d) => d.applicationId === applicationId
    );
  }

  getDocument(id: string): DocumentWithVersions {
    return getDocumentById(id);
  }

  async uploadDocument(input: {
    applicationId: string;
    documentId?: string;
    fileName: string;
    contentType: string;
    data: Buffer;
  }) {
    if (input.documentId) {
      return saveDocumentVersion({
        documentId: input.documentId,
        buffer: input.data,
        mimeType: input.contentType,
        fileName: input.fileName,
      });
    }
    return saveNewDocument(
      {
        applicationId: input.applicationId,
        name: input.fileName,
        category: "general",
      },
      input.data,
      input.contentType,
      input.fileName
    );
  }

  updateStatus(id: string, status: DocumentStatus) {
    DocumentStatusSchema.parse(status);
    if (status === "accepted") return acceptDocument(id);
    if (status === "rejected") return rejectDocument(id);

    const doc = requireDoc(id);
    doc.status = status;
    doc.updatedAt = now();
    return storeDoc(doc);
  }

  listVersions(id: string): DocumentVersion[] {
    return [...requireDoc(id).versions];
  }

  async streamVersion(id: string, res: Response) {
    await streamDocument(id, res);
  }

  async downloadDocument(id: string) {
    const result = await downloadDocument(id);
    if (!result) throw new Error("Document not found");
    return { buffer: result.buffer };
  }

  delete(id: string) {
    return deleteDocument(id);
  }
}

export const documentService = new DocumentService();
export const createDocumentService = (): DocumentService => new DocumentService();
export type DocumentServiceType = DocumentService;
EOF

echo "[✅] documentService.ts rewritten and fixed"
