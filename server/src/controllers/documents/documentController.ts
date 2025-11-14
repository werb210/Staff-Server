import type { Request, Response } from "express";
import {
  getDocument,
  listDocumentsForApplication,
  uploadDocument,
  updateDocumentStatus,
} from "../../services/documentService.js";

export async function fetchDocument(req: Request, res: Response) {
  const user = req.user;
  const { id } = req.params;

  const doc = await getDocument(user, id);
  if (!doc) return res.status(404).json({ message: "Not found" });

  return res.json({ message: "OK", data: doc });
}

export async function fetchDocumentsForApplication(req: Request, res: Response) {
  const user = req.user;
  const { appId } = req.params;

  const docs = await listDocumentsForApplication(user, appId);
  return res.json({ message: "OK", data: docs });
}

export async function handleUploadDocument(req: Request, res: Response) {
  const user = req.user;
  const { applicationId, name, category, silo } = req.body;

  const file = req.file;
  if (!file) return res.status(400).json({ message: "Missing file" });

  const created = await uploadDocument(user, {
    applicationId,
    name,
    category,
    silo,
    data: file.buffer,
  });

  return res.status(201).json({ message: "OK", data: created });
}

export async function acceptDocument(req: Request, res: Response) {
  const user = req.user;
  const { id } = req.params;

  const updated = await updateDocumentStatus(user, id, "ACCEPTED");
  return res.json({ message: "OK", data: updated });
}

export async function rejectDocument(req: Request, res: Response) {
  const user = req.user;
  const { id } = req.params;

  const updated = await updateDocumentStatus(user, id, "REJECTED");
  return res.json({ message: "OK", data: updated });
}
