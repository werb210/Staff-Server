import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "advisor", "agent"]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: UserRoleSchema,
});

export const PipelineStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  ownerId: z.string().uuid().nullable(),
});

export const PipelineAssignmentSchema = z.object({
  applicationId: z.string().uuid(),
  stageId: z.string().uuid(),
  ownerId: z.string().uuid().nullable(),
});

export type User = z.infer<typeof UserSchema>;
export type PipelineStage = z.infer<typeof PipelineStageSchema>;
