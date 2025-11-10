import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

/**
 * Schema describing a pipeline stage for application processing.
 */
export const pipelineStageSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Pipeline stage identifier must be a valid UUID"
    }),
  name: z.string().min(1, "Pipeline stage name is required"),
  order: z.number().int().nonnegative(),
  slaHours: z.number().int().positive(),
  description: z.string().optional()
});

/**
 * Schema representing the assignment of an application to a stage.
 */
export const pipelineAssignmentSchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Application identifier must be a valid UUID"
    }),
  stageId: pipelineStageSchema.shape.id,
  assignedBy: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "User identifier must be a valid UUID"
    }),
  assignedAt: z.string().datetime()
});

export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type PipelineAssignment = z.infer<typeof pipelineAssignmentSchema>;
