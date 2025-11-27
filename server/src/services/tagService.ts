// =============================================================================
// server/src/services/tagService.ts
// BLOCK 28 — Tag management service
// =============================================================================

import { prisma } from "../db/index";

const tagService = {
  /**
   * Get all tags in the system (alias for list)
   */
  async getAll() {
    return this.list();
  },

  /**
   * List all tags
   */
  async list() {
    return prisma.tag.findMany({
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
    return prisma.tag.findUnique({
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
    if (!name) throw new Error("Tag name is required");

    return prisma.tag.create({
      data: { name, color: color || "#6B7280" },
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
    const updateData = {
      ...data,
      color: data.color ?? undefined,
    };

    return prisma.tag.update({
      where: { id: tagId },
      data: updateData,
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
    return prisma.tag.delete({
      where: { id: tagId },
    });
  },

  /**
   * Attach a tag to an application
   */
  async attachToApplication(tagId: string, applicationId: string) {
    return prisma.applicationTag.create({
      data: {
        tagId,
        applicationId,
      },
    });
  },

  /**
   * Remove a tag from an application
   */
  async detachFromApplication(tagId: string, applicationId: string) {
    return prisma.applicationTag.deleteMany({
      where: {
        tagId,
        applicationId,
      },
    });
  },

  /**
   * Get tags for an application
   */
  async listForApplication(appId: string) {
    return prisma.applicationTag.findMany({
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

// =============================================================================
// END OF FILE
// =============================================================================
