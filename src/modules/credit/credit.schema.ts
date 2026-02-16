import { z } from "zod";
import {
  YEARS_IN_BUSINESS,
  ANNUAL_REVENUE,
  MONTHLY_REVENUE,
  AR_BALANCE,
  COLLATERAL,
} from "./credit.enums";

export const CreditReadinessSchema = z
  .object({
    companyName: z.string().trim().min(2),
    fullName: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(8),

    industry: z.string().trim().min(2),
    yearsInBusiness: z.enum(YEARS_IN_BUSINESS),
    annualRevenue: z.enum(ANNUAL_REVENUE),
    monthlyRevenue: z.enum(MONTHLY_REVENUE),
    arBalance: z.enum(AR_BALANCE),
    collateral: z.enum(COLLATERAL),
  })
  .strict();

export type CreditReadinessInput = z.infer<typeof CreditReadinessSchema>;
