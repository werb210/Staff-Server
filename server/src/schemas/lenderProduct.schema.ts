import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

/**
 * Schema representing the basic structure of a lender product.
 */
export const lenderProductSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Lender product identifier must be a valid UUID"
    }),
  lenderId: z
    .string()
    .min(1)
    .refine((value: string) => isValidUuid(value), {
      message: "Lender identifier must be a valid UUID"
    }),
  name: z.string().min(3, "Product name must contain at least three characters"),
  interestRate: z.number().nonnegative(),
  termMonths: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tags: z.array(z.string()).default([])
});

/**
 * Schema used to validate creation payloads for lender products.
 */
export const createLenderProductSchema = lenderProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

/**
 * Schema used to validate updates for lender products.
 */
export const updateLenderProductSchema = createLenderProductSchema.partial().extend({
  id: lenderProductSchema.shape.id
});

export type LenderProduct = z.infer<typeof lenderProductSchema>;
export type CreateLenderProductInput = z.infer<typeof createLenderProductSchema>;
export type UpdateLenderProductInput = z.infer<typeof updateLenderProductSchema>;
