// ============================================================================
// server/src/services/tagService.ts
// Unified service rewrite (BLOCK 16)
// ============================================================================

import db from "../db/index.js";

const tagService = {
  /**
   * List all tags
   */
  async list() {
    return db.tag.findMany({
      orderBy: { name: "asc" },
    });
  },

  /**
   * Create a new tag
   * @param {{ name: string }} params
   */
  async create({ name }) {
    return db.tag.create({
      data: { name },
    });
  },

  /**
   * Update an existing tag
   * @param {string} id
   * @param {{ name?: string }} params
   */
  async update(id, params) {
    const existing = await db.tag.findUnique({ where: { id } });
    if (!existing) throw new Error("Tag not found");

    return db.tag.update({
      where: { id },
      data: { ...params },
    });
  },

  /**
   * Delete a tag
   * @param {string} id
   */
  async remove(id) {
    const existing = await db.tag.findUnique({ where: { id } });
    if (!existing) throw new Error("Tag not found");

    await db.tag.delete({ where: { id } });

    return { id, deleted: true };
  },
};

export default tagService;

// ============================================================================
// END OF FILE
// ============================================================================
