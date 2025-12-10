import { z } from "zod";

export const createTaskSchema = z.object({
  assignedToUserId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["open", "completed", "cancelled"]).optional(),
});
