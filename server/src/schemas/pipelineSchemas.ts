import { z } from "zod";
import { PipelineAssignmentSchema, PipelineStageSchema } from "./userSchemas.js";

export const PipelineRecordSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  stageId: z.string().uuid(),
  ownerId: z.string().uuid().nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});

export const PipelineAssignmentRequestSchema = PipelineAssignmentSchema;
export const PipelineStageUpdateSchema = PipelineStageSchema.pick({ name: true, ownerId: true, order: true }).partial();
