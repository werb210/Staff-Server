import { z } from "zod";

export const RetryQueueItemSchema = z.object({
  id: z.string().uuid(),
  jobType: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
});

export const RetryQueueActionSchema = z.object({
  id: z.string().uuid(),
});

export const BackupRequestSchema = z.object({
  scope: z.enum(["database", "documents", "full"]),
});
