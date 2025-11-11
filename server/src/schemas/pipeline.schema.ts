import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";
import {
  ApplicationAssignmentSchema,
  ApplicationSchema,
  ApplicationStatusSchema,
} from "./application.schema.js";

export const PipelineStageSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  status: ApplicationStatusSchema,
  position: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  totalLoanAmount: z.number().nonnegative(),
  averageScore: z.number().min(0).max(100).optional(),
  lastUpdatedAt: z.string().datetime({ offset: true }),
  applications: z.array(ApplicationSchema),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineBoardSchema = z.object({
  stages: z.array(PipelineStageSchema),
  assignments: z.array(
    ApplicationAssignmentSchema.extend({
      assignedAt: z.string().datetime({ offset: true }),
      note: z.string().max(500).optional(),
    }),
  ),
});

export type PipelineBoard = z.infer<typeof PipelineBoardSchema>;

export const PipelineTransitionSchema = z.object({
  applicationId: uuidSchema,
  fromStage: ApplicationStatusSchema.optional(),
  toStage: ApplicationStatusSchema,
  assignedTo: z.string().min(1).optional(),
  note: z.string().max(500).optional(),
});

export type PipelineTransitionInput = z.infer<typeof PipelineTransitionSchema>;

export const PipelineAssignmentSchema = ApplicationAssignmentSchema.extend({
  note: z.string().max(500).optional(),
});

export type PipelineAssignmentInput = z.infer<typeof PipelineAssignmentSchema>;
