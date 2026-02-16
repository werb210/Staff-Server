import { z } from "zod";

export const createApplicationSchema = z.object({
  companyName: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email(),
  industry: z.string().min(1),

  yearsInBusiness: z.enum([
    "Zero",
    "Under 1 Year",
    "1 to 3 Years",
    "Over 3 Years",
  ]),

  annualRevenue: z.enum([
    "Zero to $150,000",
    "$150,001 to $500,000",
    "$500,001 to $1,000,000",
    "$1,000,001 to $3,000,000",
    "Over $3,000,000",
  ]),

  monthlyRevenue: z.enum([
    "Under $10,000",
    "$10,001 to $30,000",
    "$30,001 to $100,000",
    "Over $100,000",
  ]),

  arBalance: z.enum([
    "No Account Receivables",
    "Zero to $100,000",
    "$100,000 to $250,000",
    "$250,000 to $500,000",
    "$500,000 to $1,000,000",
    "$1,000,000 to $3,000,000",
    "Over $3,000,000",
  ]),

  collateralAvailable: z.enum([
    "No Collateral Available",
    "$1 to $100,000",
    "$100,001 to $250,000",
    "$250,001 to $500,000",
    "$500,001 to $1 million",
    "Over $1 million",
  ]),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
