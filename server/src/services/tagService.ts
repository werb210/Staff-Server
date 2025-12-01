// ============================================================================
// server/src/services/tagService.ts
// BLOCK 28 — Tag management service
// ============================================================================

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

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
    prismaRemoved();
  },

  /**
   * Get a single tag
   */
  async get(tagId: string) {
    prismaRemoved();
  },

  /**
   * Create tag
   */
  async create(name: string, color: string | null = null) {
    if (!name) throw new Error("Tag name is required");

    prismaRemoved();
  },

  /**
   * Update tag
   */
  async update(tagId: string, data: { name?: string; color?: string | null }) {
    const updateData = {
      ...data,
      color: data.color ?? undefined,
    };

    prismaRemoved();
  },

  /**
   * Delete a tag
   */
  async remove(tagId: string) {
    prismaRemoved();
  },

  /**
   * Attach a tag to an application
   */
  async attachToApplication(tagId: string, applicationId: string) {
    prismaRemoved();
  },

  /**
   * Remove a tag from an application
   */
  async detachFromApplication(tagId: string, applicationId: string) {
    prismaRemoved();
  },

  /**
   * Get tags for an application
   */
  async listForApplication(appId: string) {
    prismaRemoved();
  },
};

export default tagService;

// ============================================================================
// END OF FILE
// ============================================================================
