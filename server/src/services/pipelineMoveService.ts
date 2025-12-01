import { pipelineRepo } from "../db/repositories/pipeline.repo";

export const pipelineMoveService = {
  async move(applicationId: string, fromStage: string, toStage: string) {
    return pipelineRepo.moveWithHistory(applicationId, fromStage, toStage);
  }
};
