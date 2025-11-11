import { z } from "zod";

export const LenderProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  rate: z.number().min(0),
  termMonths: z.number().int().positive(),
});

export const CreateLenderProductSchema = LenderProductSchema.omit({ id: true });

export const CreateLenderSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email(),
  products: z.array(CreateLenderProductSchema).default([]),
});

export const LenderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  contactEmail: z.string().email(),
  products: z.array(LenderProductSchema),
});

export const LenderReportRequestSchema = z.object({
  lenderId: z.string().uuid(),
  rangeStart: z.string().datetime({ offset: true }),
  rangeEnd: z.string().datetime({ offset: true }),
});

export const SendToLenderSchema = z.object({
  lenderId: z.string().uuid(),
  applicationId: z.string().uuid(),
  notes: z.string().optional(),
});

export type LenderProduct = z.infer<typeof LenderProductSchema>;
export type CreateLenderProductInput = z.infer<typeof CreateLenderProductSchema>;
export type CreateLenderInput = z.infer<typeof CreateLenderSchema>;
export type Lender = z.infer<typeof LenderSchema>;
