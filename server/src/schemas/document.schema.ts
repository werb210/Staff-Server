import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), { message: "Value must be a valid UUID" });

export const documentTypeSchema = z.enum(["identification", "financial", "collateral", "other"]);
export const documentStatusSchema = z.enum(["pending", "received", "processing", "rejected"]);

export const documentSchema = z.object({
  id: uuidSchema,
  applicationId: uuidSchema.optional(),
  name: z.string().min(1, "Document name is required"),
  type: documentTypeSchema,
  mimeType: z.string().min(1, "Document MIME type is required"),
  url: z.string().url("Document URL must be valid"),
  checksum: z.string().min(1, "Checksum is required"),
  uploadedAt: z.string().datetime(),
  status: documentStatusSchema
});

export const uploadDocumentSchema = z.object({
  applicationId: uuidSchema,
  name: z.string().min(1, "Document name is required"),
  type: documentTypeSchema.default("other"),
  mimeType: z.string().min(1, "MIME type is required"),
  content: z.string().min(1, "Document content is required"),
  metadata: z.record(z.string()).default({})
});

export const documentRequirementSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, "Requirement name is required"),
  description: z.string().min(1, "Requirement description is required"),
  required: z.boolean(),
  status: documentStatusSchema
});

export type Document = z.infer<typeof documentSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;

export function parseDocument(input: unknown): Document {
  return documentSchema.parse(input);
}

export function parseUploadDocumentInput(input: unknown): UploadDocumentInput {
  return uploadDocumentSchema.parse(input);
}

export function parseDocumentRequirement(input: unknown): DocumentRequirement {
  return documentRequirementSchema.parse(input);
}
