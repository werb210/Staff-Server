import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";
import { ApplicationStatusSchema } from "./application.schema.js";

export const PipelineStageSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  status: ApplicationStatusSchema,
  position: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  totalLoanAmount: z.number().nonnegative(),
  averageScore: z.number().min(0).max(100).optional(),
  lastUpdatedAt: z.string().datetime({ offset: true }),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;
