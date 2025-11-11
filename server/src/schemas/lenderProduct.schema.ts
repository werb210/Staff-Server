import { z } from "zod";
import { uuidSchema } from "../utils/uuidValidator.js";

export const LenderSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  status: z.enum(["active", "paused", "onboarding"]).default("active"),
  rating: z.number().min(0).max(5).optional(),
});

export type Lender = z.infer<typeof LenderSchema>;

export const LenderDocumentRequirementSchema = z.object({
  documentType: z.string().min(1),
  required: z.boolean(),
  description: z.string().min(1),
});

export type LenderDocumentRequirement = z.infer<
  typeof LenderDocumentRequirementSchema
>;

export const LenderProductSchema = z.object({
  id: uuidSchema,
  lenderId: uuidSchema,
  name: z.string().min(1),
  interestRate: z.number().min(0),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().positive(),
  termMonths: z.number().int().positive(),
  documentation: z.array(LenderDocumentRequirementSchema),
  recommendedScore: z.number().min(0).max(100),
});

export type LenderProduct = z.infer<typeof LenderProductSchema>;

export const LenderReportSchema = z.object({
  id: uuidSchema,
  lenderId: uuidSchema,
  status: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  totalApplications: z.number().int().nonnegative(),
  avgDecisionTimeHours: z.number().nonnegative(),
  topProducts: z.array(LenderProductSchema.pick({ id: true, name: true })),
});

export type LenderReport = z.infer<typeof LenderReportSchema>;
