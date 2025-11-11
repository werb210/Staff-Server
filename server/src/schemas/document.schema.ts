import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";

export const DocumentStatusSchema = z.enum([
  "uploaded",
  "processing",
  "review",
  "approved",
  "rejected",
]);

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const DocumentMetadataSchema = z.object({
  id: uuidSchema,
  applicationId: uuidSchema,
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  status: DocumentStatusSchema,
  uploadedAt: z.string().datetime({ offset: true }),
  checksum: z.string().min(8),
  blobUrl: z.string().url(),
  sasUrl: z.string().url().optional(),
  aiSummary: z.string().optional(),
  explainability: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
  ocrTextPreview: z.string().optional(),
  lastAnalyzedAt: z.string().datetime({ offset: true }).optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

export const DocumentUploadSchema = z.object({
  applicationId: uuidSchema,
  documentId: uuidSchema,
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  notes: z.string().optional(),
});

export const DocumentStatusUpdateSchema = z.object({
  id: uuidSchema,
  status: DocumentStatusSchema,
  reviewedBy: z.string().min(1).optional(),
});

export const DocumentSaveSchema = z.object({
  id: uuidSchema.optional(),
  applicationId: uuidSchema,
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  status: DocumentStatusSchema.optional(),
  checksum: z.string().min(8).optional(),
  blobUrl: z.string().url().optional(),
  aiSummary: z.string().optional(),
  explainability: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
});

export type DocumentSaveInput = z.infer<typeof DocumentSaveSchema>;

export const DocumentStatusResponseSchema = z.object({
  id: uuidSchema,
  status: DocumentStatusSchema,
  lastUpdatedAt: z.string().datetime({ offset: true }),
});

export type DocumentStatusResponse = z.infer<typeof DocumentStatusResponseSchema>;
