import { z } from "zod";
import { isValidUuid } from "../utils/uuidValidator.js";

const uuidSchema = z
  .string()
  .min(1)
  .refine((value: string) => isValidUuid(value), { message: "Value must be a valid UUID" });

export const lenderProductSchema = z.object({
  id: uuidSchema,
  lenderId: uuidSchema,
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Product description is required"),
  interestRate: z.number().positive(),
  maxAmount: z.number().positive(),
  termMonths: z.number().int().positive()
});

export type LenderProduct = z.infer<typeof lenderProductSchema>;

export function parseLenderProduct(input: unknown): LenderProduct {
  return lenderProductSchema.parse(input);
}
