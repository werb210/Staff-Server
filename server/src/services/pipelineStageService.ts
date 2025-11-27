// =============================================================================
// server/src/services/pipelineStageService.ts
// BLOCK 22 — Complete Prisma rewrite
// =============================================================================

import db from "../db/index";

const pipelineStageService = {
  /**
   * Get all pipeline stages ordered by their order index
   */
  async list() {
    return db.pipelineStage.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Get a single stage
   */
  async get(stageId: string) {
    return db.pipelineStage.findUnique({
      where: { id: stageId },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Create stage
   */
  async create(name: string, order: number) {
    return db.pipelineStage.create({
      data: { name, order },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
      },
    });
  },

  /**
   * Update stage
   */
  async update(stageId: string, data: { name?: string; order?: number }) {
    return db.pipelineStage.update({
      where: { id: stageId },
      data,
      select: {
        id: true,
        name: true,
        order: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Delete stage
   * Will only succeed if no applications reference it
   */
  async remove(stageId: string) {
    const apps = await db.application.count({ where: { stageId } });

    if (apps > 0) {
      throw new Error(
        `Cannot delete pipeline stage ${stageId} — ${apps} applications still assigned.`,
      );
    }

    return db.pipelineStage.delete({
      where: { id: stageId },
    });
  },

  /**
   * Bulk reorder stages
   */
  async reorder(stageOrders: { id: string; order: number }[]) {
    const transactions = stageOrders.map((stage) =>
      db.pipelineStage.update({
        where: { id: stage.id },
        data: { order: stage.order },
      }),
    );

    return db.$transaction(transactions);
  },
};

export default pipelineStageService;

// =============================================================================
// END OF FILE
// =============================================================================
