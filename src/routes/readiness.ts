import { Router } from "express";
import { db } from "../db";

const router = Router();

router.post("/", (req, res) => {
  const { revenue, timeInBusiness, creditScore } = req.body as {
    revenue?: number;
    timeInBusiness?: number;
    creditScore?: number;
  };

  let score = 0;

  if (typeof revenue === "number" && revenue > 100000) score += 30;
  if (typeof timeInBusiness === "number" && timeInBusiness > 24) score += 30;
  if (typeof creditScore === "number" && creditScore > 650) score += 40;

  const rating =
    score >= 80 ? "Strong" :
    score >= 50 ? "Moderate" :
    "Needs Improvement";

  res.json({ score, rating });
});

router.post("/readiness", async (req, res) => {
  const {
    companyName,
    fullName,
    email,
    phone,
    industry,
    yearsInBusiness,
    monthlyRevenue,
    annualRevenue,
    arOutstanding,
    existingDebt,
  } = req.body as {
    companyName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    industry?: string;
    yearsInBusiness?: string;
    monthlyRevenue?: string;
    annualRevenue?: string;
    arOutstanding?: string;
    existingDebt?: string;
  };

  await db.query(
    `
      insert into crm_leads
      (company_name, full_name, email, phone, industry, metadata)
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      companyName ?? null,
      fullName ?? null,
      email ?? null,
      phone ?? null,
      industry ?? null,
      JSON.stringify({
        yearsInBusiness,
        monthlyRevenue,
        annualRevenue,
        arOutstanding,
        existingDebt,
        source: "capital_readiness",
      }),
    ]
  );

  res.json({ status: "stored" });
});

export default router;
