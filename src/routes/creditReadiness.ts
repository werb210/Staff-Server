import { type Request, type Response, Router } from "express";
import {
  createCreditReadinessLead,
  findCreditReadinessById,
  findCreditReadinessByToken,
} from "../modules/readiness/creditReadiness.storage";
import type { CreditReadinessDTO } from "../modules/creditReadiness/dto";

export type ReadinessPayload = CreditReadinessDTO;

type LegacyReadinessPayload = ReadinessPayload & {
  contactName?: string;
  collateralAvailable?: string;
};


function scoreReadiness(data: ReadinessPayload) {
  let score = 40;

  if (data.yearsInBusiness === "Over 3 Years") score += 20;
  else if (data.yearsInBusiness === "1 to 3 Years") score += 12;
  else if (data.yearsInBusiness === "Under 1 Year") score += 6;
  else score += 2;

  if (data.annualRevenue === "Over $3,000,000") score += 25;
  else if (data.annualRevenue === "$1,000,001 to $3,000,000") score += 20;
  else if (data.annualRevenue === "$500,001 to $1,000,000") score += 14;
  else if (data.annualRevenue === "$150,001 to $500,000") score += 8;
  else score += 3;

  if (data.arBalance.includes("Over")) score += 12;
  else if (data.arBalance.includes("$500,000")) score += 10;
  else if (data.arBalance.includes("$100,000")) score += 6;

  if (data.availableCollateral.includes("Over")) score += 15;
  else if (data.availableCollateral.includes("$500,000")) score += 12;
  else if (data.availableCollateral.includes("$100,000")) score += 6;

  return Math.min(100, score);
}

function tierFromScore(score: number) {
  if (score >= 85) return "Institutional Profile";
  if (score >= 70) return "Strong Non-Bank Profile";
  if (score >= 55) return "Structured Opportunity";
  return "Early Stage";
}

function normalizePayload(raw: LegacyReadinessPayload): ReadinessPayload {
  return {
    companyName: raw.companyName,
    fullName: raw.fullName ?? raw.contactName ?? "",
    email: raw.email,
    phone: raw.phone,
    industry: raw.industry,
    yearsInBusiness: raw.yearsInBusiness,
    annualRevenue: raw.annualRevenue,
    monthlyRevenue: raw.monthlyRevenue,
    arBalance: raw.arBalance,
    availableCollateral: raw.availableCollateral ?? raw.collateralAvailable ?? "",
  };
}

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const payload = normalizePayload((req.body ?? {}) as LegacyReadinessPayload);

    const requiredFields: Array<keyof ReadinessPayload> = [
      "companyName",
      "fullName",
      "email",
      "phone",
      "industry",
      "yearsInBusiness",
      "annualRevenue",
      "monthlyRevenue",
      "arBalance",
      "availableCollateral",
    ];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    const score = scoreReadiness(payload);
    const tier = tierFromScore(score);
    const lead = await createCreditReadinessLead(payload);

    const readinessToken = lead.id;

    return res.status(201).json({
      success: true,
      creditReadinessId: lead.id,
      readinessToken,
      score,
      tier,
      leadId: lead.id,
      sessionToken: readinessToken,
    });
  } catch (_err) {
    return res.status(500).json({ error: "Credit readiness failed" });
  }
});

router.get("/session/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const lead = await findCreditReadinessByToken(token);

    if (!lead) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      industry: lead.industry,
      yearsInBusiness: lead.yearsInBusiness,
      annualRevenue: lead.annualRevenue,
      monthlyRevenue: lead.monthlyRevenue,
      arBalance: lead.arBalance,
      availableCollateral: lead.availableCollateral,
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
      availableCollateral: lead.availableCollateral,
    });
  } catch {
    return res.status(500).json({ error: "Session lookup failed" });
  }
});

export default router;
