// server/src/controllers/financialsController.ts

import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import ocrRepo from "../db/repositories/ocrResults.repo.js";
import documentVersionsRepo from "../db/repositories/documentVersions.repo.js";

export const financialsController = {
  // GET /financials
  list: asyncHandler(async (_req: Request, res: Response) => {
    const items = await ocrRepo.findMany({});
    res.json(items);
  }),

  // GET /financials/:id
  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await ocrRepo.findById(id);

    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(item);
  }),

  // POST /financials
  create: asyncHandler(async (req: Request, res: Response) => {
    const created = await ocrRepo.create(req.body);
    res.status(201).json(created);
  }),

  // PUT /financials/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await ocrRepo.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(updated);
  }),

  // DELETE /financials/:id
  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await ocrRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  }),

  // POST /financials/document/:documentId/ocr
  ocrForDocument: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params;

    // Document must have versions before OCR
    const versions = await documentVersionsRepo.findMany({ documentId });
    if (versions.length === 0) {
      return res.status(404).json({ error: "No versions" });
    }

    const ocr = await ocrRepo.findMany({ documentId });
    res.json(ocr);
  }),
};

export default financialsController;
