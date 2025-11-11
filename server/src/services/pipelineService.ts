import {
  type PipelineAssignmentInput,
  type PipelineBoard,
  type PipelineTransitionInput,
} from "../schemas/pipeline.schema.js";
import { applicationService } from "./applicationService.js";

interface AssignmentRecord {
  id: string;
  assignedTo: string;
  stage: PipelineAssignmentInput["stage"];
  assignedAt: string;
  note?: string;
}

/**
 * PipelineService coordinates application stage transitions and assignments.
 */
class PipelineService {
  private readonly assignments = new Map<string, AssignmentRecord>();

  private readonly allowedTransitions: Record<string, ReadonlyArray<string>> = {
    draft: ["submitted", "review"],
    submitted: ["review", "draft"],
    review: ["approved", "submitted"],
    approved: ["completed", "review"],
    completed: [],
  };

  private validateAssignee(assignee: string) {
    if (!assignee.trim()) {
      throw new Error("Assigned user is required");
    }

    const pattern = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    const usernamePattern = /^[a-z0-9._-]{3,}$/i;
    if (!pattern.test(assignee) && !usernamePattern.test(assignee)) {
      throw new Error("Assigned user must be an email or username");
    }
  }

  private guardTransition(current: string, target: string) {
    const allowed = this.allowedTransitions[current] ?? [];
    if (!allowed.includes(target)) {
      throw new Error(`Cannot transition from ${current} to ${target}`);
    }
  }

  public getBoard(): PipelineBoard {
    const stages = applicationService.buildPipeline();
    const assignments = Array.from(this.assignments.values()).map((assignment) => ({
      id: assignment.id,
      assignedTo: assignment.assignedTo,
      stage: assignment.stage,
      assignedAt: assignment.assignedAt,
      note: assignment.note,
    }));

    return { stages, assignments };
  }

  public listAssignments(): AssignmentRecord[] {
    return Array.from(this.assignments.values());
  }

  public transitionApplication(payload: PipelineTransitionInput) {
    const application = applicationService.getApplication(payload.applicationId);

    if (payload.fromStage && payload.fromStage !== application.status) {
      throw new Error(
        `Application is not currently in ${payload.fromStage}; found ${application.status}`,
      );
    }

    this.guardTransition(application.status, payload.toStage);

    const updated = payload.assignedTo
      ? applicationService.assignApplication(
          application.id,
          payload.assignedTo,
          payload.toStage,
        )
      : applicationService.updateStatus(application.id, payload.toStage);

    if (payload.assignedTo) {
      this.recordAssignment({
        id: updated.id,
        assignedTo: payload.assignedTo,
        stage: payload.toStage,
        note: payload.note,
      });
    }

    return {
      application: updated,
      board: this.getBoard(),
    };
  }

  public assignApplication(payload: PipelineAssignmentInput) {
    this.validateAssignee(payload.assignedTo);
    const application = applicationService.assignApplication(
      payload.id,
      payload.assignedTo,
      payload.stage,
    );

    this.recordAssignment({
      id: application.id,
      assignedTo: payload.assignedTo,
      stage: payload.stage ?? application.status,
      note: payload.note,
    });

    const assignment = this.assignments.get(application.id)!;

    return {
      application,
      assignment,
      board: this.getBoard(),
    };
  }

  private recordAssignment(record: Omit<AssignmentRecord, "assignedAt">) {
    this.validateAssignee(record.assignedTo);
    const assignedAt = new Date().toISOString();
    this.assignments.set(record.id, {
      ...record,
      assignedAt,
    });
  }
}

export const pipelineService = new PipelineService();

export type PipelineServiceType = PipelineService;
