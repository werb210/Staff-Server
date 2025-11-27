// ============================================================================
// server/src/controllers/ocrExtractController.ts
// Unified controller rewrite (BLOCK 12)
// ============================================================================

import { asyncHandler } from "../utils/asyncHandler.js";
import ocrExtractService from "../services/ocrExtractService.js";

const ocrExtractController = {
  /**
   * POST /ocr/extract
   * Body: { documentId: string }
   */
  extract: asyncHandler(async (req, res) => {
    const data = await ocrExtractService.extract(req.body);
    res.status(200).json({ success: true, data });
  }),

  /**
   * GET /ocr/:documentId
   */
  getByDocument: asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const data = await ocrExtractService.getByDocument(documentId);
    res.status(200).json({ success: true, data });
  }),

  /**
   * GET /ocr
   * List all OCR extracts
   */
  list: asyncHandler(async (_req, res) => {
    const data = await ocrExtractService.list();
    res.status(200).json({ success: true, data });
  }),

  /**
   * DELETE /ocr/:documentId
   */
  remove: asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const data = await ocrExtractService.remove(documentId);
    res.status(200).json({ success: true, data });
  }),
};

export default ocrExtractController;

// ============================================================================
// END OF FILE
// ============================================================================
