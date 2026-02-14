import { Router } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../../db";

const router = Router();

router.post("/ai/confidence", async (req, res) => {
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
  } = req.body ?? {};

  const years = Number(yearsInBusiness ?? 0);
  const monthly = Number(monthlyRevenue ?? 0);
  const score = years > 2 && monthly > 20000 ? "Strong" : "Needs Review";

  await pool.query(
    `insert into crm_leads
      (id, company_name, full_name, email, phone, industry, years_in_business, monthly_revenue, annual_revenue, ar_outstanding, existing_debt, source, tags, created_at)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confidence_check', $12::jsonb, now())`,
    [
      uuid(),
      companyName ?? null,
      fullName ?? null,
      email ?? null,
      phone ?? null,
      industry ?? null,
      yearsInBusiness != null ? String(yearsInBusiness) : null,
      monthlyRevenue != null ? String(monthlyRevenue) : null,
      annualRevenue != null ? String(annualRevenue) : null,
      arOutstanding != null ? String(arOutstanding) : null,
      existingDebt != null ? String(existingDebt) : null,
      JSON.stringify(["confidence_check"]),
    ]
  );

  res.json({
    score,
    message:
      score === "Strong"
        ? "Based on the information provided, your business appears aligned with common underwriting parameters."
        : "We recommend speaking with an advisor to explore structuring options.",
  });
});

router.post("/ai/voice/token", async (_req, res) => {
  res.json({ token: "voice-ready-placeholder" });
});

export default router;
