import { z } from "zod";

export const ApplicationStatusSchema = z.enum(["draft", "submitted", "completed"]);

export const ApplicationCreateSchema = z.object({
  applicantName: z.string().min(1, "Applicant name is required"),
  email: z.string().email(),
  phone: z.string().min(5),
  amount: z.number().positive(),
  productType: z.string().min(1),
  notes: z.string().optional(),
});

export const ApplicationUpdateSchema = z.object({
  applicantName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  amount: z.number().positive().optional(),
  productType: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const ApplicationSubmitSchema = z.object({
  id: z.string().uuid(),
  submittedBy: z.string().min(1),
});

export const ApplicationCompleteSchema = z.object({
  id: z.string().uuid(),
  completedBy: z.string().min(1),
});

export const ApplicationQuerySchema = z.object({
  status: ApplicationStatusSchema.optional(),
});

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof ApplicationUpdateSchema>;
