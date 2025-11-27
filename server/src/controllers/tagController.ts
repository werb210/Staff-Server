// ============================================================================
// server/src/controllers/tagController.ts
// Unified controller rewrite (BLOCK 15)
// ============================================================================

import asyncHandler from "../utils/asyncHandler.js";
import tagService from "../services/tagService.js";

const tagController = {
  /**
   * GET /tags
   * List all tags
   */
  list: asyncHandler(async (_req, res) => {
    const data = await tagService.list();
    res.status(200).json({ success: true, data });
  }),

  /**
   * POST /tags
   * Body: { name: string, color?: string | null }
   */
  create: asyncHandler(async (req, res) => {
    const { name, color = null } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'name'",
      });
    }

    const data = await tagService.create(name, color);

    res.status(201).json({ success: true, data });
  }),

  /**
   * PUT /tags/:id
   * Body: { name?: string; color?: string | null }
   */
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;

    const data = await tagService.update(id, { name, color });

    res.status(200).json({ success: true, data });
  }),

  /**
   * DELETE /tags/:id
   */
  remove: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const data = await tagService.remove(id);

    res.status(200).json({ success: true, data });
  }),
};

export default tagController;

// ============================================================================
// END OF FILE
// ============================================================================
