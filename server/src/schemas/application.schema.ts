import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";
import { phoneSchema } from "../utils/phone.js";

/**
 * Full application lifecycle aligned with:
 * - Staff Portal pipeline columns
 * - Staff Server pipeline rules
 * - Document validation workflow
 * - AI Summary + Lender Matching engine
 */
export const ApplicationStageSchema = z.enum([
  "new",
  "requires_docs",
  "in_review",
  "ready_for_lenders",
  "sent_to_lenders",
  "approved",
  "declined",
]);

export type ApplicationStage = z.infer<typeof ApplicationStageSchema>;

export const ApplicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "review",
  "approved",
  "completed",
]);

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/**
 * Core application model
 */
export const ApplicationSchema = z.object({
  id: uuidSchema,
  externalId: z.string().optional(),

  businessName: z.string().min(1),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  applicantPhone: phoneSchema.optional(),

  productId: uuidSchema,
  productCategory: z.string().min(1),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().min(1),

  stage: ApplicationStageSchema,
  status: ApplicationStatusSchema,

  score: z.number().min(0).max(100).optional(),
  matchScore: z.number().min(0).max(100).optional(),

  assignedTo: z.string().optional(),
  referrerId: z.string().optional(),

  silo: z.enum(["BF", "SLF"]).default("BF"),

  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  submittedAt: z.string().datetime({ offset: true }).optional(),
  submittedBy: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  completedBy: z.string().optional(),

  aiSummary: z.string().optional(),
  ocrExtracted: z.record(z.any()).optional(),
});

export type Application = z.infer<typeof ApplicationSchema>;

/**
 * CREATE
 */
export const ApplicationCreateSchema = z.object({
  businessName: z.string().min(1),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  applicantPhone: phoneSchema.optional(),
  productId: uuidSchema,
  productCategory: z.string().min(1),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().min(1),
  stage: ApplicationStageSchema.optional(),
  status: ApplicationStatusSchema.optional(),
  assignedTo: z.string().optional(),
  referrerId: z.string().optional(),
  silo: z.enum(["BF", "SLF"]).optional(),
});

export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;

/**
 * UPDATE
 */
export const ApplicationUpdateSchema = ApplicationCreateSchema.partial().extend({
  id: uuidSchema,
});

export type ApplicationUpdateInput = z.infer<typeof ApplicationUpdateSchema>;

/**
 * ACTION SCHEMAS
 */
export const ApplicationStageUpdateSchema = z.object({
  id: uuidSchema,
  stage: ApplicationStageSchema,
});

export const ApplicationStatusUpdateSchema = z.object({
  id: uuidSchema,
  status: ApplicationStatusSchema,
});

export const ApplicationSubmitSchema = z.object({
  id: uuidSchema,
  submittedBy: z.string().min(1),
});

export const ApplicationCompleteSchema = z.object({
  id: uuidSchema,
  completedBy: z.string().min(1),
});

/**
 * PUBLIC VERSION
 */
export const ApplicationPublicSchema = ApplicationSchema.pick({
  id: true,
  businessName: true,
  loanAmount: true,
  loanPurpose: true,
  stage: true,
  score: true,
  matchScore: true,
  submittedAt: true,
}).extend({
  summary: z.string().min(1),
});

export type ApplicationPublic = z.infer<typeof ApplicationPublicSchema>;

/**
 * ---------------------------
 *   MISSING SCHEMAS ADDED
 * ---------------------------
 */

/** Required by routes — alias of ApplicationStageUpdateSchema */
export const ApplicationAssignmentSchema = ApplicationStageUpdateSchema;

/** Required by routes — alias of ApplicationPublicSchema */
export const ApplicationPublishSchema = ApplicationPublicSchema;
