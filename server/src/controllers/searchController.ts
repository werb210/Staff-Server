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
   */
  globalSearch: asyncHandler(async (req, res) => {
    const { q } = req.query;

    const data = await searchService.globalSearch(String(q ?? ""));

    res.status(200).json({ success: true, data });
  }),
};

export default searchController;

// ============================================================================
// END OF FILE
// ============================================================================
