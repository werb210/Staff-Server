import { Router } from "express";
import { getContinuation } from "./continuation.service";

const router = Router();

router.get("/:token", async (req, res) => {
  const token = req.params.token;
  const record = await getContinuation(token);

  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    companyName: record.company_name,
    fullName: record.full_name,
    email: record.email,
    phone: record.phone,
    industry: record.industry,
    yearsInBusiness: record.years_in_business,
    monthlyRevenue: record.monthly_revenue,
    annualRevenue: record.annual_revenue,
    arOutstanding: record.ar_outstanding,
    existingDebt: record.existing_debt,
  });
});

export default router;
