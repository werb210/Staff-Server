// ============================================================================
// server/src/services/tagService.ts
// BLOCK 23 — Complete Prisma rewrite
// ============================================================================

import db from "../db/index.js";

const tagService = {
  /**
   * List all tags
   */
  async list() {
    return db.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Get a single tag
   */
  async get(tagId: string) {
    return db.tag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Create tag
   */
  async create(name: string, color: string | null = null) {
    return db.tag.create({
      data: { name, color },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  /**
   * Update tag
   */
  async update(tagId: string, data: { name?: string; color?: string | null }) {
    return db.tag.update({
      where: { id: tagId },
      data,
      select: {
        id: true,
        name: true,
        color: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Delete a tag
   */
  async remove(tagId: string) {
    return db.tag.delete({
      where: { id: tagId },
    });
  },

  /**
   * Attach a tag to an application
   */
  async attachToApplication(appId: string, tagId: string) {
    return db.applicationTag.create({
      data: {
        applicationId: appId,
        tagId,
      },
    });
  },

  /**
   * Remove a tag from an application
   */
  async detachFromApplication(appId: string, tagId: string) {
    return db.applicationTag.deleteMany({
      where: {
        applicationId: appId,
        tagId,
      },
    });
  },

  /**
   * Get tags for an application
   */
  async listForApplication(appId: string) {
    return db.applicationTag.findMany({
      where: { applicationId: appId },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });
  },
};

export default tagService;

// ============================================================================
// END OF FILE
// ============================================================================
