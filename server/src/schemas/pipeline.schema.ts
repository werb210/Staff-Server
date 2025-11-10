import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), { message: "Value must be a valid UUID" });

/**
 * Schema describing a pipeline stage for application processing.
 */
export const pipelineStageSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, "Pipeline stage name is required"),
  order: z.number().int().nonnegative(),
  slaHours: z.number().int().positive(),
  description: z.string().optional()
});

/**
 * Schema representing the assignment of an application to a stage.
 */
export const pipelineAssignmentSchema = z.object({
  applicationId: uuidSchema,
  stageId: pipelineStageSchema.shape.id,
  assignedBy: uuidSchema,
  assignedAt: z.string().datetime()
});

export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type PipelineAssignment = z.infer<typeof pipelineAssignmentSchema>;

export function parsePipelineStage(input: unknown): PipelineStage {
  return pipelineStageSchema.parse(input);
}

export function parsePipelineAssignment(input: unknown): PipelineAssignment {
  return pipelineAssignmentSchema.parse(input);
}
