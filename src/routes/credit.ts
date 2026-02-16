import { Router } from "express";
import { z } from "zod";
import { createCRMLead } from "../services/crmService";

const router = Router();

const creditSchema = z.object({
  companyName: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  industry: z.string().optional(),
  yearsInBusiness: z.number().nonnegative().default(0),
  monthlyRevenue: z.number().nonnegative().optional(),
  annualRevenue: z.number().nonnegative().default(0),
  arBalance: z.number().nonnegative().optional(),
  collateralAvailable: z.boolean().default(false),
});

router.post("/score", async (req, res) => {
  const parsed = creditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const {
    companyName,
    fullName,
    email,
    phone,
    industry,
    yearsInBusiness,
    monthlyRevenue,
    annualRevenue,
    arBalance,
    collateralAvailable,
  } = parsed.data;

  let score = 50;

  if (yearsInBusiness > 2) score += 10;
  if (annualRevenue > 500000) score += 15;
  if (!collateralAvailable) score += 10;

  score = Math.min(score, 85);

  await createCRMLead({
    companyName,
    fullName,
    email,
    phone,
    industry,
    source: "website_credit_check",
    metadata: {
      yearsInBusiness,
      monthlyRevenue,
      annualRevenue,
      arBalance,
      collateralAvailable,
      score,
    },
  });

  res.json({
    score,
    message: "Preliminary assessment complete.",
  });
});

export default router;
