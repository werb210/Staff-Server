import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";
import { sanitizePhoneNumber, isE164PhoneNumber } from "../utils/phone.js";

/**
 * Shared schema for UUID validation using the UUID helper.
 */
const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), {
    message: "Value must be a valid UUID"
  });

/**
 * Enumeration of supported application statuses.
 */
export const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed"
]);

/**
 * Schema describing a minimal applicant profile used when creating an application.
 */
export const applicantSchema = z.object({
  id: uuidSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z
    .string()
    .transform((value: string) => sanitizePhoneNumber(value))
    .refine((value: string) => isE164PhoneNumber(value), {
      message: "Phone number must be a valid E.164 string"
    })
});

/**
 * Schema describing the loan details when creating an application.
 */
export const loanDetailsSchema = z.object({
  amountRequested: z.number().positive("Amount requested must be positive"),
  termMonths: z.number().int().positive("Term must be at least one month"),
  purpose: z.string().min(5, "Provide a short description of the loan purpose"),
  collateral: z.string().optional()
});

/**
 * Schema for documents included during creation time.
 */
export const initialDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  type: z.string().min(1, "Document type is required"),
  url: z.string().url("Document URL must be valid"),
  checksum: z.string().min(1, "Checksum is required")
});

/**
 * Schema used to validate payload for creating a new draft application.
 */
export const createApplicationSchema = z.object({
  applicant: applicantSchema,
  loanDetails: loanDetailsSchema,
  documents: z.array(initialDocumentSchema).default([])
});

/**
 * Schema used to validate payload for submitting an existing application.
 */
export const submitApplicationSchema = z.object({
  applicationId: uuidSchema,
  submittedBy: uuidSchema,
  declarationAccepted: z.boolean(),
  additionalNotes: z.string().optional()
});

/**
 * Schema used to validate payload for completing an application.
 */
export const completeApplicationSchema = z.object({
  applicationId: uuidSchema,
  completedBy: uuidSchema,
  completionNotes: z.string().optional()
});

/**
 * Schema describing a summarized application returned to API consumers.
 */
export const applicationSummarySchema = z.object({
  id: uuidSchema,
  applicant: applicantSchema,
  loanDetails: loanDetailsSchema,
  status: applicationStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Schema describing a public application record.
 */
export const publicApplicationSchema = applicationSummarySchema.pick({
  id: true,
  loanDetails: true,
  status: true,
  createdAt: true
});

/**
 * Exported TypeScript types for convenient reuse.
 */
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type CompleteApplicationInput = z.infer<typeof completeApplicationSchema>;
export type ApplicationSummary = z.infer<typeof applicationSummarySchema>;
export type PublicApplication = z.infer<typeof publicApplicationSchema>;

export function parseCreateApplicationInput(input: unknown): CreateApplicationInput {
  return createApplicationSchema.parse(input);
}

export function parseSubmitApplicationInput(input: unknown): SubmitApplicationInput {
  return submitApplicationSchema.parse(input);
}

export function parseCompleteApplicationInput(input: unknown): CompleteApplicationInput {
  return completeApplicationSchema.parse(input);
}

export function parseApplicationSummary(input: unknown): ApplicationSummary {
  return applicationSummarySchema.parse(input);
}

export function parsePublicApplication(input: unknown): PublicApplication {
  return publicApplicationSchema.parse(input);
}
