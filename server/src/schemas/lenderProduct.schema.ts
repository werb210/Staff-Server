// server/src/schemas/lenderProduct.schema.ts
import { z } from "zod";

/* ---------------------------------------------------------
   BASE PRODUCT SCHEMA
--------------------------------------------------------- */
export const LenderProductBaseSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(2),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().positive(),
  productType: z.string().min(1),
  interestRate: z.number().min(0),
  requirements: z.record(z.any()).optional().default({}),
});

/* ---------------------------------------------------------
   CREATE
--------------------------------------------------------- */
export const LenderProductCreateSchema = LenderProductBaseSchema;

/* ---------------------------------------------------------
   UPDATE (partial)
--------------------------------------------------------- */
export const LenderProductUpdateSchema = LenderProductBaseSchema.partial();

/* ---------------------------------------------------------
   FULL PRODUCT
--------------------------------------------------------- */
export const LenderProductSchema = LenderProductBaseSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LenderProduct = z.infer<typeof LenderProductSchema>;
export type LenderProductCreateInput = z.infer<typeof LenderProductCreateSchema>;
export type LenderProductUpdateInput = z.infer<typeof LenderProductUpdateSchema>;
