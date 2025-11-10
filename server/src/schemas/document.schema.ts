import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

/**
 * Reusable schema fragment for UUID validation used across document payloads.
 */
const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), {
    message: "Value must be a valid UUID"
  });

/**
 * Input payload for uploading a new supporting document.
 */
export const documentUploadSchema = z.object({
  applicationId: uuidSchema,
  fileName: z.string().min(1, "fileName is required"),
  mimeType: z.string().min(1, "mimeType is required"),
  content: z.string().min(1, "content must be a base64 string")
});

/**
 * Schema describing the status metadata returned after upload or status lookups.
 */
export const documentStatusSchema = z.object({
  id: uuidSchema,
  applicationId: uuidSchema,
  fileName: z.string(),
  mimeType: z.string(),
  status: z.enum(["processing", "ready", "failed"]),
  uploadedAt: z.string().datetime()
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
