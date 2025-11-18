// FILE: server/src/controllers/documentsController.ts
import { Request, Response } from "express";
import documentsService from "../services/documentsService.js";

export const uploadDocument = async (req: Request, res: Response) => {
  const doc = await documentsService.uploadDocument(req);
  res.status(201).json(doc);
};

export const getDocumentsByApplication = async (req: Request, res: Response) => {
  res.json(await documentsService.getDocumentsByApplication(req.params.applicationId));
};

export default { uploadDocument, getDocumentsByApplication };
