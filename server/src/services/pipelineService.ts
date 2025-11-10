// Auto-generated stub by Codex
// Stub pipeline service returning static pipeline stages

export type PipelineStage = {
  id: string;
  name: string;
};

class PipelineService {
  listStages(): PipelineStage[] {
    return [
      { id: "stage-1", name: "Intake" },
      { id: "stage-2", name: "Review" }
    ];
  }
}

export const pipelineService = new PipelineService();
