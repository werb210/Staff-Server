// ============================================================================
// server/src/controllers/financialsController.ts
// Unified controller rewrite (BLOCK 13)
// ============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import financialsService from "../services/financialsService.js";

const financialsController = {
  /**
   * GET /financials/:applicationId
   * Returns all processed financial OCR + normalized values for the application.
   */
  getByApplication: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const data = await financialsService.getByApplication(applicationId);
    res.status(200).json({ success: true, data });
  }),

  /**
   * POST /financials/process
   * Body: { documentId: string }
   */
  processDocument: asyncHandler(async (req, res) => {
    const data = await financialsService.processDocument(req.body);
    res.status(200).json({ success: true, data });
  }),

  /**
   * GET /financials
   * Lists all financial records.
   */
  list: asyncHandler(async (req, res) => {
    const data = await financialsService.list();
    res.status(200).json({ success: true, data });
  }),

  /**
   * DELETE /financials/:id
   */
  remove: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await financialsService.remove(id);
    res.status(200).json({ success: true, data });
  }),
};

export default financialsController;

// ============================================================================
// END OF FILE
// ============================================================================
