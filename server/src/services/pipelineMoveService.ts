// ============================================================================
// server/src/services/pipelineMoveService.ts
// Simplified for Drizzle repositories — pipeline stages tracked via events
// ============================================================================

import pipelineEventsRepo from "../db/repositories/pipelineEvents.repo.js";
import * as pipelineService from "./pipelineService.js";

interface ApplicationStageSnapshot {
  id: string;
  stageId: string;
  updatedAt: Date;
}

interface PipelineMoveLogWithStage {
  id: string;
  stageId: string;
  createdAt: Date;
  applicationId: string;
  reason?: string | null;
  stage: {
    name: string;
    order: number;
  };
}

const pipelineMoveService = {
  /**
   * Move an application from one pipeline stage to another
   * @param {string} applicationId
   * @param {string} newStageId
   */
  async moveToStage(applicationId: string, newStageId: string): Promise<ApplicationStageSnapshot> {
    const updated = await pipelineService.updateStage(applicationId, newStageId, "Manual move");
    if (!updated) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    return {
      id: updated.id,
      stageId: updated.pipelineStage,
      updatedAt: updated.updatedAt as Date,
    };
  },

  /**
   * Get move history for an application
   * @param {string} applicationId
   */
  async listMoves(applicationId: string): Promise<PipelineMoveLogWithStage[]> {
    const events = await pipelineEventsRepo.findMany({ applicationId });
    const ordered = (await events).sort(
      (a: any, b: any) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime(),
    );

    return ordered.map((event, index) => ({
      id: event.id,
      stageId: event.stage,
      createdAt: event.createdAt as Date,
      applicationId: event.applicationId,
      reason: event.reason ?? null,
      stage: {
        name: event.stage,
        order: index + 1,
      },
    }));
  },
};

export default pipelineMoveService;

// ============================================================================
// END OF FILE
// ============================================================================
