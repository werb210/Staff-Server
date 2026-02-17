import { type Request, type Response, Router } from "express";
import { z } from "zod";
import {
  createCapitalReadinessLead,
  findCapitalReadinessBySession,
  findCreditReadinessById,
} from "../modules/readiness/creditReadiness.storage";
import { mapReadinessTier } from "../modules/readiness/readinessScoring.service";

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

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreditReadinessSchema.parse(req.body);
    const score = calculateScore(parsed);
    const tier = mapReadinessTier(score);

    const lead = await createCapitalReadinessLead({
      ...parsed,
      score,
      tier,
      tag: "credit_readiness",
    });

    return res.status(201).json({
      success: true,
      leadId: lead.id,
      sessionToken: lead.sessionToken,
      score,
      tier,
    });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid input" });
  }
});

router.get("/session/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const lead = await findCapitalReadinessBySession(token);

    if (!lead) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      industry: lead.industry,
      yearsInBusiness: lead.yearsInBusiness,
      annualRevenue: lead.annualRevenue,
      monthlyRevenue: lead.monthlyRevenue,
      arBalance: lead.arBalance,
      collateralAvailable: lead.collateralAvailable,
      companyName: lead.companyName,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
    });
  } catch {
    return res.status(500).json({ error: "Session lookup failed" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const lead = await findCreditReadinessById(id);

    if (!lead) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({
      id: lead.id,
      companyName: lead.companyName,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      yearsInBusiness: lead.yearsInBusiness,
      annualRevenue: lead.annualRevenue,
      monthlyRevenue: lead.monthlyRevenue,
      arBalance: lead.arBalance,
      collateralAvailable: lead.collateralAvailable,
      score: lead.score,
      tier: lead.tier,
      sessionToken: lead.sessionToken,
    });
  } catch {
    return res.status(500).json({ error: "Session lookup failed" });
  }
});

export default router;
