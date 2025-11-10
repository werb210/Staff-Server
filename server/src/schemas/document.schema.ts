import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

/**
 * Schema describing metadata for a document requirement associated with an application.
 */
export const documentRequirementSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Document requirement identifier must be a valid UUID"
    }),
  name: z.string().min(1, "Requirement name is required"),
  description: z.string().min(1, "Requirement description is required"),
  required: z.boolean(),
  status: z.enum(["pending", "received", "approved", "rejected"])
});

/**
 * Schema describing a document that is uploaded in support of an application.
 */
export const documentUploadSchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Application identifier must be a valid UUID"
    }),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  checksum: z.string().min(1, "Checksum is required"),
  contentLength: z.number().int().positive("Content length must be positive"),
  storageKey: z.string().min(1, "Storage key is required")
});

/**
 * Schema representing the result of an OCR insight.
 */
export const ocrInsightSchema = z.object({
  field: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1)
});

export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type OcrInsight = z.infer<typeof ocrInsightSchema>;
