// ============================================================================
// server/src/services/pipelineService.ts
// BLOCK 21 — Complete Prisma rewrite
// ============================================================================

import db from "../db/index.js";

const pipelineService = {
  /**
   * List all pipeline stages in correct order
   */
  async listStages() {
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
   * Get applications for a specific stage
   * @param {string} stageId
   */
  async listApplications(stageId) {
    return db.application.findMany({
      where: { stageId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        amountRequested: true,
        status: true,
        stageId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  },

  /**
   * Get entire pipeline board (all stages + applications)
   */
  async fullBoard() {
    const stages = await db.pipelineStage.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        applications: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            amountRequested: true,
            status: true,
            stageId: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return stages;
  },

  /**
   * Update a pipeline stage
   * @param {string} stageId
   * @param {{ name?:string, order?:number }} data
   */
  async updateStage(stageId, data) {
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
   * Create a pipeline stage
   */
  async createStage(name, order) {
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
   * Delete a stage
   * (Only safe if no apps attached)
   */
  async deleteStage(stageId) {
    const apps = await db.application.count({ where: { stageId } });
    if (apps > 0) {
      throw new Error("Cannot delete stage with applications in it.");
    }

    return db.pipelineStage.delete({
      where: { id: stageId },
    });
  },
};

export default pipelineService;

// ============================================================================
// END OF FILE
// ============================================================================
