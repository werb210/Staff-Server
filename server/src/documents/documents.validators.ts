import { z } from "zod";

export const DocumentCreateSchema = z.object({
  applicationId: z.string().uuid(),
  documentId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

export const DocumentCompleteSchema = z.object({
  documentId: z.string().uuid(),
  blobKey: z.string().min(1),
  checksumSha256: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  fileName: z.string().min(1),
});

export const DocumentValidateSchema = z.object({
  checksumSha256: z.string().min(1).optional(),
});

export const DocumentIntegrityEventCreate = z.object({
  documentId: z.string().uuid(),
  eventType: z.enum([
    "upload_started",
    "upload_completed",
    "checksum_verified",
    "missing_detected",
    "restored",
    "version_created",
    "required_doc_added",
    "required_doc_removed",
  ]),
  metadata: z.record(z.any()).default({}),
});

export type DocumentCreateInput = z.infer<typeof DocumentCreateSchema>;
export type DocumentCompleteInput = z.infer<typeof DocumentCompleteSchema>;
export type DocumentIntegrityEventInput = z.infer<typeof DocumentIntegrityEventCreate>;
