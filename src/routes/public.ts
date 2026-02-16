import { Router } from "express";
import { z } from "zod";
import { getActiveLenderCount } from "../services/publicService";
import {
  createCapitalReadinessLead,
  findCapitalReadinessBySession,
} from "../modules/readiness/creditReadiness.storage";
import publicApplicationRoutes from "./publicApplication";

const router = Router();

const CreditReadinessSchema = z
  .object({
    companyName: z.string().min(1),
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),

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
  })
  .strict();

function calculateScore(input: z.infer<typeof CreditReadinessSchema>) {
  let score = 40;

  const revenueWeight = {
    "Zero to $150,000": 5,
    "$150,001 to $500,000": 10,
    "$500,001 to $1,000,000": 18,
    "$1,000,001 to $3,000,000": 25,
    "Over $3,000,000": 35,
  } as const;

  const yearsWeight = {
    Zero: 5,
    "Under 1 Year": 8,
    "1 to 3 Years": 15,
    "Over 3 Years": 25,
  } as const;

  const collateralWeight = {
    "No Collateral Available": 5,
    "$1 to $100,000": 10,
    "$100,001 to $250,000": 18,
    "$250,001 to $500,000": 25,
    "$500,001 to $1 million": 30,
    "Over $1 million": 35,
  } as const;

  score += revenueWeight[input.annualRevenue];
  score += yearsWeight[input.yearsInBusiness];
  score += collateralWeight[input.collateralAvailable];

  return Math.min(100, score);
}

router.get("/lender-count", async (_req, res) => {
  const count = await getActiveLenderCount();
  res.json({ count });
});

router.post("/readiness", async (req, res) => {
  try {
    const parsed = CreditReadinessSchema.parse(req.body);

    const score = calculateScore(parsed);

    const tier = score >= 85 ? "Growth Ready" : score >= 65 ? "Near Ready" : "Foundation Stage";

    const lead = await createCapitalReadinessLead({
      companyName: parsed.companyName,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,

      industry: parsed.industry,
      yearsInBusiness: parsed.yearsInBusiness,
      annualRevenue: parsed.annualRevenue,
      monthlyRevenue: parsed.monthlyRevenue,
      arBalance: parsed.arBalance,
      collateralAvailable: parsed.collateralAvailable,

      score,
      tier,
      tag: "credit_readiness",
    });

    res.status(201).json({
      sessionToken: lead.sessionToken,
      leadId: lead.id,
      score,
      tier,
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid input",
    });
  }
});

router.get("/readiness/bridge/:sessionToken", async (req, res) => {
  const { sessionToken } = req.params;

  const lead = await findCapitalReadinessBySession(sessionToken);

  if (!lead) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    step1: {
      industry: lead.industry,
      yearsInBusiness: lead.yearsInBusiness,
      annualRevenue: lead.annualRevenue,
      monthlyRevenue: lead.monthlyRevenue,
      arBalance: lead.arBalance,
      collateralAvailable: lead.collateralAvailable,
    },
    step3: {
      companyName: lead.companyName,
    },
    step4: {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
    },
  });
});

router.use(publicApplicationRoutes);

export default router;
