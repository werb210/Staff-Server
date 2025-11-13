import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";
import {
  ApplicationAssignmentSchema,
  ApplicationSchema,
} from "./application.schema.js";

/**
 * FINAL CANONICAL PIPELINE STAGES
 * Must match pipelineService.PIPELINE_STAGES exactly.
 */
export const PipelineStageNameSchema = z.enum([
  "New",
  "Requires Docs",
  "In Review",
  "Sent to Lenders",
  "Approved",
  "Declined",
]);

export type PipelineStageName = z.infer<typeof PipelineStageNameSchema>;

/**
 * Pipeline stage column schema (as returned by pipelineService.getAllStages)
 *
 * NOTE:
 * - id === stage name (NOT a UUID)
 * - applications is ALWAYS an array (UI doesn't use it, but backend returns [])
 */
export const PipelineStageSchema = z.object({
  id: PipelineStageNameSchema,        // <── FIXED: stage ID matches service
  name: PipelineStageNameSchema,
  stage: PipelineStageNameSchema,
  position: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  totalLoanAmount: z.number().nonnegative(),
  averageScore: z.number().min(0).max(100).optional(),
  lastUpdatedAt: z.string().datetime({ offset: true }),
  applications: z.array(ApplicationSchema).optional().default([]),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

/**
 * Entire board schema
 */
export const PipelineBoardSchema = z.object({
  stages: z.array(PipelineStageSchema),
  assignments: z.array(
    ApplicationAssignmentSchema.extend({
      assignedAt: z.string().datetime({ offset: true }),
      note: z.string().max(500).optional(),
    })
  ),
});

export type PipelineBoard = z.infer<typeof PipelineBoardSchema>;

/**
 * Stage transition input
 */
export const PipelineTransitionSchema = z.object({
  applicationId: uuidSchema,
  fromStage: PipelineStageNameSchema.optional(),
  toStage: PipelineStageNameSchema,
  assignedTo: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type PipelineTransitionInput = z.infer<typeof PipelineTransitionSchema>;

/**
 * Assignment schema
 */
export const PipelineAssignmentSchema = ApplicationAssignmentSchema.extend({
  note: z.string().max(500).optional(),
});

export type PipelineAssignmentInput = z.infer<typeof PipelineAssignmentSchema>;
