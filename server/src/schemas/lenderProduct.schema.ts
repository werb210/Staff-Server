import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), {
    message: "Value must be a valid UUID"
  });

/**
 * Minimal schema describing a lender product for stubbed responses.
 */
export const lenderProductSchema = z.object({
  id: uuidSchema,
  lenderId: uuidSchema,
  name: z.string().min(1, "name is required"),
  interestRate: z.number().nonnegative(),
  termMonths: z.number().int().positive()
});

export const createLenderProductSchema = lenderProductSchema.omit({ id: true });

export type LenderProduct = z.infer<typeof lenderProductSchema>;
export type CreateLenderProductInput = z.infer<typeof createLenderProductSchema>;
