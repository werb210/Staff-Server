import { z } from "zod";

export const createApplicationSchema = z.object({
  companyName: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email(),
  industry: z.string().min(1),

  yearsInBusiness: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),

  annualRevenue: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),

  monthlyRevenue: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),

  arBalance: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),

  collateralAvailable: z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value)),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
