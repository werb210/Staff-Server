// server/src/controllers/documentController.ts
import { Request, Response } from 'express';
import * as documentService from '../services/documentService.js';

//
// ======================================================
//  Upload or Replace Document
// ======================================================
//
export async function uploadDocument(req: Request, res: Response) {
  try {
    const { applicationId, documentId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    const doc = await documentService.uploadDocument({
      applicationId,
      documentId: documentId || null,
      fileName,
      mimeType,
      buffer,
    });

    return res.status(200).json(doc);
  } catch (err: any) {
    console.error('uploadDocument error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  Get Document for Preview or Download
// ======================================================
//
export async function getDocument(req: Request, res: Response) {
  try {
    const { documentId } = req.params;
    const doc = await documentService.getDocument(documentId);
    return res.status(200).json(doc);
  } catch (err: any) {
    console.error('getDocument error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  List Documents for Application
// ======================================================
//
export async function listDocuments(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;
    const list = await documentService.listByApplication(applicationId);
    return res.status(200).json(list);
  } catch (err: any) {
    console.error('listDocuments error →', err);
    return res.status(500).json({ error: err.message });
  }
}
