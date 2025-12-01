import { pipelineRepo } from "../db/repositories/pipeline.repo";
import { pipelineStageRepo } from "../db/repositories/pipelineStage.repo";

export const pipelineService = {
  async stages() {
    return pipelineStageRepo.list();
  },

  async list(stageId: string) {
    return pipelineRepo.listByStage(stageId);
  },

  async move(applicationId: string, toStageId: string) {
    return pipelineRepo.move(applicationId, toStageId);
  }
};
