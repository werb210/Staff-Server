// =============================================================================
// server/src/services/pipelineService.ts
// BLOCK 21 — Complete Prisma rewrite
// =============================================================================

import db from "../db/index";

type ApplicationSummary = {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  amountRequested: number;
  status: string;
  stageId: string;
  updatedAt: Date;
  createdAt: Date;
};

type PipelineStageSummary = {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type PipelineStageWithApplications = {
  id: string;
  name: string;
  order: number;
  applications: ApplicationSummary[];
};

type PipelineStageUpdateResult = {
  id: string;
  name: string;
  order: number;
  updatedAt: Date;
};

type PipelineStageCreateResult = {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
};

type PipelineStageUpdateInput = {
  name?: string;
  order?: number;
};

const pipelineService = {
  /**
   * List all pipeline stages in correct order
   */
  async listStages(): Promise<PipelineStageSummary[]> {
    return db.pipelineStage.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<PipelineStageSummary[]>;
  },

  /**
   * Get applications for a specific stage
   * @param {string} stageId
   */
  async listApplications(stageId: string): Promise<ApplicationSummary[]> {
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
    }) as Promise<ApplicationSummary[]>;
  },

  /**
   * Get entire pipeline board (all stages + applications)
   */
  async fullBoard(): Promise<PipelineStageWithApplications[]> {
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

    return stages as PipelineStageWithApplications[];
  },

  /**
   * Update a pipeline stage
   * @param {string} stageId
   * @param {{ name?:string, order?:number }} data
   */
  async updateStage(
    stageId: string,
    data: PipelineStageUpdateInput,
  ): Promise<PipelineStageUpdateResult> {
    return db.pipelineStage.update({
      where: { id: stageId },
      data,
      select: {
        id: true,
        name: true,
        order: true,
        updatedAt: true,
      },
    }) as Promise<PipelineStageUpdateResult>;
  },

  /**
   * Create a pipeline stage
   */
  async createStage(name: string, order: number): Promise<PipelineStageCreateResult> {
    return db.pipelineStage.create({
      data: { name, order },
      select: {
        id: true,
        name: true,
        order: true,
        createdAt: true,
      },
    }) as Promise<PipelineStageCreateResult>;
  },

  /**
   * Delete a stage
   * (Only safe if no apps attached)
   */
  async deleteStage(stageId: string): Promise<PipelineStageSummary> {
    const apps = await db.application.count({ where: { stageId } });
    if (apps > 0) {
      throw new Error("Cannot delete stage with applications in it.");
    }

    return db.pipelineStage.delete({
      where: { id: stageId },
    }) as Promise<PipelineStageSummary>;
  },
};

export default pipelineService;

// =============================================================================
// END OF FILE
// =============================================================================
