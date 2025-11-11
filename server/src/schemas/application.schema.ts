import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";
import { phoneSchema } from "../utils/phone.js";

export const ApplicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "review",
  "approved",
  "completed",
]);

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationSchema = z.object({
  id: uuidSchema,
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  applicantPhone: phoneSchema.optional(),
  productId: uuidSchema,
  loanAmount: z.number().positive(),
  loanPurpose: z.string().min(1),
  status: ApplicationStatusSchema,
  score: z.number().min(0).max(100).optional(),
  assignedTo: z.string().min(1).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  submittedAt: z.string().datetime({ offset: true }).optional(),
  submittedBy: z.string().min(1).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  completedBy: z.string().min(1).optional(),
});

export type Application = z.infer<typeof ApplicationSchema>;

export const ApplicationCreateSchema = z.object({
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  applicantPhone: phoneSchema.optional(),
  productId: uuidSchema,
  loanAmount: z.number().positive(),
  loanPurpose: z.string().min(1),
  status: ApplicationStatusSchema.optional(),
  assignedTo: z.string().min(1).optional(),
  score: z.number().min(0).max(100).optional(),
});

export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;

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

export const ApplicationPublishSchema = z.object({
  id: uuidSchema,
  publishedBy: z.string().min(1),
});

export const ApplicationPublicSchema = ApplicationSchema.pick({
  id: true,
  applicantName: true,
  loanAmount: true,
  loanPurpose: true,
  status: true,
  score: true,
  submittedAt: true,
}).extend({
  summary: z.string().min(1),
});

export type ApplicationPublic = z.infer<typeof ApplicationPublicSchema>;
