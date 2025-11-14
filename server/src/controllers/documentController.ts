import type { Request, Response } from "express";
import { DocumentStatus } from "@prisma/client";

import {
  downloadDocument,
  getDocument as getDocumentService,
  getDocumentStatus as getDocumentStatusService,
  getDocumentVersions,
  getDocumentsForApplication,
  getDownloadUrl,
  getUploadUrl,
  listDocuments,
  registerDocumentFromPayload,
  updateDocumentStatus,
  uploadDocumentFromFile,
} from "../services/documentService.js";

const getUserSilos = (req: Request) => req.user?.silos ?? [];

const parseStatus = (value: unknown): DocumentStatus | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return ["pending", "accepted", "rejected"].includes(normalized)
    ? (normalized as DocumentStatus)
    : null;
};

export const listDocumentsHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const applicationId = typeof req.query.applicationId === "string" ? req.query.applicationId : undefined;

  const documents = await listDocuments(silos, applicationId);
  return res.json(documents);
};

export const registerDocumentHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const required = ["id", "applicationId", "fileName", "fileContent"] as const;
  const missing = required.filter((key) => typeof (payload as Record<string, unknown>)[key] !== "string");
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }

  const document = await registerDocumentFromPayload(
    {
      id: payload.id,
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      fileContent: payload.fileContent,
      contentType: typeof payload.contentType === "string" ? payload.contentType : undefined,
      note: typeof payload.note === "string" ? payload.note : undefined,
      uploadedBy: typeof payload.uploadedBy === "string" ? payload.uploadedBy : req.user?.email,
      documentType: typeof payload.documentType === "string" ? payload.documentType : undefined,
    },
    silos,
  );

  if (!document) return res.status(404).json({ error: "Application not found or silo blocked" });

  return res.status(201).json(document);
};

export const uploadDocumentHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const file = req.file;
  const appId = req.body?.appId ?? req.body?.applicationId;
  if (!file || typeof appId !== "string") {
    return res.status(400).json({ error: "File and applicationId are required" });
  }

  const document = await uploadDocumentFromFile(appId, file, silos);
  if (!document) return res.status(404).json({ error: "Application not found or silo blocked" });

  return res.status(201).json(document);
};

export const getDocumentHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const document = await getDocumentService(req.params.id, silos);
  if (!document) return res.status(404).json({ error: "Not found" });

  return res.json(document);
};

export const getDocumentsForApplicationHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const documents = await getDocumentsForApplication(req.params.appId, silos);
  if (!documents) return res.status(404).json({ error: "Not found" });

  return res.json(documents);
};

export const getDocumentVersionsHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const versions = await getDocumentVersions(req.params.id, silos);
  if (!versions) return res.status(404).json({ error: "Not found" });

  return res.json(versions);
};

export const getDocumentStatusHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const status = await getDocumentStatusService(req.params.id, silos);
  if (!status) return res.status(404).json({ error: "Not found" });

  return res.json(status);
};

export const updateDocumentStatusHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const status = parseStatus(req.body?.status);
  if (!status) return res.status(400).json({ error: "Invalid status" });

  const document = await updateDocumentStatus(req.params.id, status, silos);
  if (!document) return res.status(404).json({ error: "Not found" });

  return res.json(document);
};

export const getDownloadUrlHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const version = typeof req.query.version === "string" ? Number.parseInt(req.query.version, 10) : undefined;
  const payload = await getDownloadUrl(req.params.id, silos, Number.isNaN(version) ? undefined : version);
  if (!payload) return res.status(404).json({ error: "Not found" });

  return res.json(payload);
};

export const getUploadUrlHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const uploadUrl = await getUploadUrl(req.params.id, silos);
  if (!uploadUrl) return res.status(404).json({ error: "Not found" });

  return res.json(uploadUrl);
};

export const downloadDocumentContentHandler = async (req: Request, res: Response) => {
  const silos = getUserSilos(req);
  if (silos.length === 0) return res.status(403).json({ error: "No silo access" });

  const version = typeof req.query.version === "string" ? Number.parseInt(req.query.version, 10) : undefined;
  const result = await downloadDocument(req.params.id, silos, Number.isNaN(version) ? undefined : version);
  if (!result) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", result.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  return res.send(result.buffer);
};
