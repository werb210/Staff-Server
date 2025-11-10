import { randomUUID } from "node:crypto";
import {
  parsePipelineAssignment,
  parsePipelineStage,
  type PipelineAssignment,
  type PipelineStage
} from "../schemas/pipeline.schema.js";

interface PipelineSnapshot {
  stages: PipelineStage[];
  assignments: PipelineAssignment[];
}

class PipelineService {
  private readonly stages = new Map<string, PipelineStage>();
  private readonly assignments: PipelineAssignment[] = [];

  constructor() {
    const seedStages: PipelineStage[] = [
      { id: randomUUID(), name: "Intake", order: 0, slaHours: 24, description: "Application intake and triage" },
      { id: randomUUID(), name: "Review", order: 1, slaHours: 48, description: "Underwriting review" },
      { id: randomUUID(), name: "Compliance", order: 2, slaHours: 24, description: "Compliance verification" }
    ];

    seedStages.forEach((stage) => this.stages.set(stage.id, parsePipelineStage(stage)));
  }

  listStages(): PipelineStage[] {
    return Array.from(this.stages.values()).sort((a, b) => a.order - b.order);
  }

  getSnapshot(): PipelineSnapshot {
    return {
      stages: this.listStages(),
      assignments: [...this.assignments]
    };
  }

  assignApplication(input: unknown): PipelineAssignment {
    const base = (typeof input === "object" && input !== null ? (input as Partial<PipelineAssignment>) : {});
    const stageId = base.stageId ?? this.listStages()[0]?.id;
    if (!stageId) {
      throw new Error("Pipeline stage is required");
    }
    const payload = parsePipelineAssignment({
      applicationId: base.applicationId ?? randomUUID(),
      stageId,
      assignedBy: base.assignedBy ?? randomUUID(),
      assignedAt: base.assignedAt ?? new Date().toISOString()
    });
    if (!this.stages.has(payload.stageId)) {
      throw new Error(`Pipeline stage ${payload.stageId} not found`);
    }
    this.assignments.push(payload);
    return payload;
  }
}

export const pipelineService = new PipelineService();
export type { PipelineStage, PipelineAssignment };
