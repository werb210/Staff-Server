import { randomUUID } from "crypto";
import {
  PipelineAssignmentRequestSchema,
  PipelineStageUpdateSchema,
} from "../schemas/pipelineSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";
import { PipelineStage } from "../types/index.js";

type PipelineAssignment = {
  id: string;
  applicationId: string;
  stageId: string;
  ownerId: string | null;
  updatedAt: string;
};

class PipelineService {
  private stages: PipelineStage[] = [];
  private assignments: PipelineAssignment[] = [];

  constructor() {
    const stageId = randomUUID();
    this.stages.push({
      id: stageId,
      name: "Review",
      order: 0,
      ownerId: null,
    });
    this.assignments.push({
      id: randomUUID(),
      applicationId: randomUUID(),
      stageId,
      ownerId: null,
      updatedAt: new Date().toISOString(),
    });
  }

  listPipeline(): { stages: PipelineStage[]; assignments: PipelineAssignment[] } {
    logInfo("Listing pipeline");
    return { stages: this.stages, assignments: this.assignments };
  }

  listStages(): PipelineStage[] {
    logInfo("Listing pipeline stages");
    return this.stages;
  }

  updateStage(id: string, payload: unknown): PipelineStage {
    const updates = parseWithSchema(PipelineStageUpdateSchema, payload);
    logInfo("Updating pipeline stage", { id, updates });
    const stage = this.stages.find((item) => item.id === id);
    if (!stage) {
      throw new Error(`Stage ${id} not found`);
    }
    Object.assign(stage, updates);
    return stage;
  }

  assignStage(payload: unknown): PipelineAssignment {
    const data = parseWithSchema(PipelineAssignmentRequestSchema, payload);
    logInfo("Assigning pipeline stage", data);
    const assignment = this.assignments.find((item) => item.applicationId === data.applicationId);
    if (assignment) {
      assignment.stageId = data.stageId;
      assignment.ownerId = data.ownerId;
      assignment.updatedAt = new Date().toISOString();
      return assignment;
    }
    const newAssignment: PipelineAssignment = {
      id: randomUUID(),
      applicationId: data.applicationId,
      stageId: data.stageId,
      ownerId: data.ownerId,
      updatedAt: new Date().toISOString(),
    };
    this.assignments.push(newAssignment);
    return newAssignment;
  }
}

export const pipelineService = new PipelineService();
