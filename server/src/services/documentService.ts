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

import { uploadBuffer, downloadBuffer, streamBlob } from "./azureBlob.js";

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

/* DocumentService Class */
export class DocumentService {
  listDocuments(applicationId?: string): DocumentWithVersions[] {
    if (!applicationId) return Array.from(documents.values());
    return Array.from(documents.values()).filter(
      (d) => d.applicationId === applicationId
    );
  }

  getDocument(id: string): DocumentWithVersions {
    return DocumentWithVersionsSchema.parse(requireDoc(id));
  }

  async uploadDocument(input: {
    applicationId: string;
    documentId?: string;
    fileName: string;
    contentType: string;
    data: Buffer;
  }): Promise<DocumentWithVersions> {
    if (input.documentId) {
      return this.saveDocumentVersion({
        documentId: input.documentId,
        buffer: input.data,
        mimeType: input.contentType,
        fileName: input.fileName,
      });
    }

    return this.saveNewDocument(
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

  saveNewDocument(
    meta: DocumentUploadMetadata,
    buffer: Buffer,
    mimeType: string,
    originalName?: string
  ): Promise<DocumentWithVersions> {
    const m = DocumentUploadMetadataSchema.parse(meta);
    const created = now();
    const id = randomUUID();
    const version = 1;
    const fileName = sanitizeName(originalName ?? m.name);
    const blobName = blobPath(id, version, fileName);

    return uploadBuffer(buffer, blobName, mimeType).then(() => {
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
    });
  }

  async saveDocumentVersion(p: {
    documentId: string;
    buffer: Buffer;
    mimeType: string;
    fileName?: string;
    category?: Document["category"];
  }): Promise<DocumentWithVersions> {
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
  }

  updateStatus(id: string, status: DocumentStatus): DocumentWithVersions {
    DocumentStatusSchema.parse(status);
    if (status === "accepted") return this.acceptDocument(id);
    if (status === "rejected") return this.rejectDocument(id);

    const doc = requireDoc(id);
    doc.status = status;
    doc.updatedAt = now();
    return storeDoc(doc);
  }

  acceptDocument(id: string): DocumentWithVersions {
    const doc = requireDoc(id);
    doc.status = "accepted";
    doc.updatedAt = now();
    return storeDoc(doc);
  }

  rejectDocument(id: string): DocumentWithVersions {
    const doc = requireDoc(id);
    doc.status = "rejected";
    doc.updatedAt = now();
    return storeDoc(doc);
  }

  listVersions(id: string): DocumentVersion[] {
    return [...requireDoc(id).versions];
  }

  async streamVersion(id: string, res: Response): Promise<void> {
    const doc = requireDoc(id);
    await streamBlob(doc.blobName, res);
  }

  async downloadDocument(id: string): Promise<{ buffer: Buffer }> {
    const result = await downloadBuffer(requireDoc(id).blobName).then((buf) => ({ buffer: buf }));
    return result;
  }

  delete(id: string): DocumentWithVersions {
    const doc = requireDoc(id);
    documents.delete(id);
    return doc;
  }
}

/* Instance & named exports for backward compatibility */
export const documentService = new DocumentService();
export const createDocumentService = (): DocumentService => new DocumentService();
export type DocumentServiceType = DocumentService;

/* Named exports for existing imports */
export const getDocumentsForApplication = (applicationId: string) =>
  documentService.listDocuments(applicationId);
export const getDocumentById = (id: string) =>
  documentService.getDocument(id);
export const saveNewDocument = (...args: Parameters<DocumentService['saveNewDocument']>) =>
  documentService.saveNewDocument(...args);
export const saveDocumentVersion = (...args: Parameters<DocumentService['saveDocumentVersion']>) =>
  documentService.saveDocumentVersion(...args);
export const acceptDocument = (id: string) => documentService.acceptDocument(id);
export const rejectDocument = (id: string) => documentService.rejectDocument(id);
export const reuploadDocument = (...args: Parameters<DocumentService['uploadDocument']>) =>
  documentService.uploadDocument(...args);
export const downloadDocument = (id: string) => documentService.downloadDocument(id);
export const downloadMultipleDocuments = async (ids: string[]) => {
  const zip = new JSZip();
  await Promise.all(
    ids.map(async (id) => {
      const buf = await documentService.downloadDocument(id);
      zip.file(`file-${id}`, buf.buffer);
    })
  );
  return zip.generateAsync({ type: "nodebuffer" });
};
export const streamDocument = (id: string, res: Response) =>
  documentService.streamVersion(id, res);
