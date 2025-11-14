import type { Request, Response } from "express";
import type { Silo } from "../services/db.js";
import { documentService } from "../services/documentService.js";

const toSilo = (value: string): Silo => value as Silo;

export const uploadDocument = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const file = req.file;
  const appId = req.params.appId;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const doc = await documentService.upload(silo, appId, file);
  if (!doc) return res.status(404).json({ error: "Application not found or silo blocked" });

  return res.status(201).json(doc);
};

export const getDocument = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.id;

  const doc = await documentService.get(silo, id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  return res.json(doc);
};

export const previewDocument = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.id;

  const file = await documentService.download(silo, id);
  if (!file) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", file.mimeType);
  return res.send(file.buffer);
};

export const downloadDocumentHandler = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.download(silo, id);
  if (!result) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", result.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.name}"`);
  return res.send(result.buffer);
};

export const acceptDocumentHandler = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.accept(
    silo,
    id,
    req.user?.id ?? "system"
  );
  if (!result) return res.status(404).json({ error: "Not found" });

  return res.json(result);
};

export const rejectDocumentHandler = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const id = req.params.id;

  const result = await documentService.reject(
    silo,
    id,
    req.user?.id ?? "system"
  );
  if (!result) return res.status(404).json({ error: "Not found" });

  return res.json(result);
};

export const downloadAllDocumentsHandler = async (req: Request, res: Response) => {
  const silo = toSilo(req.params.silo);
  const appId = req.params.appId;

  const result = await documentService.downloadAll(silo, appId);
  if (!result) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.fileName}"`
  );

  return res.send(result.zipBuffer);
};
