// server/src/dtos/productDto.ts
import { z } from "zod";

export const productDto = z.object({
  lenderId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  minAmount: z.number(),
  maxAmount: z.number(),
  rate: z.number(),
  termMonths: z.number().optional(),
  description: z.string().optional(),
});

export type ProductDto = z.infer<typeof productDto>;
