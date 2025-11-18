// ============================================================================
// server/src/controllers/searchController.ts
// Unified controller rewrite (BLOCK 14)
// ============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import searchService from "../services/searchService.js";

const searchController = {
  /**
   * GET /search
   * Query params:
   *  - q: string (required)
   *  - type: "contacts" | "companies" | "deals" | "applications" | "documents"
   *  - limit: number
   */
  globalSearch: asyncHandler(async (req, res) => {
    const { q, type, limit } = req.query;

    const data = await searchService.globalSearch({
      q: q ?? "",
      type: type ?? null,
      limit: limit ? Number(limit) : 25,
    });

    res.status(200).json({ success: true, data });
  }),

  /**
   * GET /search/recent
   * Returns recently viewed or updated entities from all models.
   */
  recent: asyncHandler(async (_req, res) => {
    const data = await searchService.recent();
    res.status(200).json({ success: true, data });
  }),

  /**
   * GET /search/suggest
   * Query param:
   *   - q: string
   * AI-powered suggestions across CRM entities.
   */
  suggest: asyncHandler(async (req, res) => {
    const { q } = req.query;

    const data = await searchService.suggest({
      q: q ?? "",
    });

    res.status(200).json({ success: true, data });
  }),
};

export default searchController;

// ============================================================================
// END OF FILE
// ============================================================================
