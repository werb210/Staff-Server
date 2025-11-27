// server/src/controllers/ocrExtractController.ts
import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import ocrExtractService from "../services/ocrExtractService";

const ocrExtractController = {
  /**
   * Fetch OCR extracts
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const applicationId = req.query.applicationId as string | undefined;
    const extracts = await ocrExtractService.list(applicationId);
    res.status(200).json({ success: true, data: extracts });
  }),

  /**
   * Create an OCR extract
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId, documentId, payload, summary } = req.body;
    const extract = await ocrExtractService.create(applicationId, documentId, {
      payload,
      summary,
    });
    res.status(200).json({ success: true, data: extract });
  }),

  /**
   * Extract text from document (mock)
   */
  extractText: asyncHandler(async (req: Request, res: Response) => {
    const data = await ocrExtractService.extract(req.body);
    res.status(200).json({ success: true, data });
  }),

  classifyDocumentType: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  }),

  extractStructuredFields: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  }),

  getTablesFromDocument: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  }),

  /**
   * Get OCR extracts for a document
   */
  getByDocument: asyncHandler(async (req: Request, res: Response) => {
    const data = await ocrExtractService.getByDocument(req.params.id);
    res.status(200).json({ success: true, data });
  }),

  /**
   * Delete OCR extracts by document
   */
  deleteByDocument: asyncHandler(async (req: Request, res: Response) => {
    const data = await ocrExtractService.remove(req.params.id);
    res.status(200).json({ success: true, data });
  }),
};

export default ocrExtractController;
