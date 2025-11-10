import { pipelineAssignmentSchema, pipelineStageSchema } from "../schemas/pipeline.schema.js";
import type { PipelineAssignment, PipelineStage } from "../schemas/pipeline.schema.js";

/**
 * Service representing the application pipeline workflow.
 */
export class PipelineService {
  private readonly stages: PipelineStage[] = [
    pipelineStageSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Intake",
      order: 0,
      slaHours: 24,
      description: "Initial document collection"
    }),
    pipelineStageSchema.parse({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Review",
      order: 1,
      slaHours: 48,
      description: "Detailed underwriting review"
    })
  ];

  /**
   * Returns the pipeline stages.
   */
  async listStages(): Promise<PipelineStage[]> {
    return [...this.stages];
  }

  /**
   * Assigns an application to a pipeline stage.
   */
  async assignToStage(assignment: PipelineAssignment): Promise<PipelineAssignment> {
    const stageExists = this.stages.some((stage) => stage.id === assignment.stageId);
    if (!stageExists) {
      throw new Error(`Pipeline stage ${assignment.stageId} does not exist`);
    }
    return pipelineAssignmentSchema.parse(assignment);
  }
}

export const pipelineService = new PipelineService();
