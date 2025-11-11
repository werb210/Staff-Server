import { z } from "zod";

export const DocumentStatusSchema = z.enum(["pending", "uploaded", "approved", "rejected"]);

export const DocumentUploadSchema = z.object({
  applicationId: z.string().uuid(),
  type: z.string().min(1),
  filename: z.string().min(1),
  content: z.string().min(1, "Base64 content required"),
});

export const DocumentStatusUpdateSchema = z.object({
  status: DocumentStatusSchema,
  reviewedBy: z.string().optional(),
});

export const DocumentQuerySchema = z.object({
  applicationId: z.string().uuid().optional(),
});

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
