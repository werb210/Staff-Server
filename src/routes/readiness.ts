import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "../db";
import {
  createReadinessLead,
  createReadinessLeadSchema,
} from "../modules/readiness/readiness.service";

const router = Router();

const readinessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

const continueSchema = z.object({
  email: z.string().trim().email(),
});

router.post("/", readinessLimiter, async (req, res) => {
  try {
    const { leadId } = await createReadinessLead(req.body ?? {});
    res.status(201).json({
      success: true,
      data: { leadId, status: "created" },
    });
  } catch (error) {
    if (
      error instanceof Error
      && (error.message === "invalid_phone" || error.name === "ZodError")
    ) {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }

    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/continue", readinessLimiter, async (req, res) => {
  try {
    const { email } = continueSchema.parse(req.body ?? {});

    const { rows } = await db.query(
      `select id, company_name, full_name, email, phone, industry,
              years_in_business, monthly_revenue, annual_revenue,
              ar_outstanding, existing_debt, created_at, used_in_application
       from continuation
       where lower(email) = lower($1)
       order by created_at desc
       limit 1`,
      [email]
    );

    const session = rows[0];
    if (!session) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/readiness", readinessLimiter, async (req, res) => {
  try {
    const parsed = createReadinessLeadSchema.parse(req.body ?? {});

    await db.query(
      `insert into crm_leads
         (company_name, full_name, email, phone, industry, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        parsed.companyName,
        parsed.fullName,
        parsed.email,
        parsed.phone,
        parsed.industry ?? null,
        JSON.stringify({
          yearsInBusiness: parsed.yearsInBusiness ?? null,
          monthlyRevenue: parsed.monthlyRevenue ?? null,
          annualRevenue: parsed.annualRevenue ?? null,
          arOutstanding: parsed.arOutstanding ?? null,
          existingDebt: parsed.existingDebt ?? null,
          source: "capital_readiness",
        }),
      ]
    );

    res.status(201).json({ success: true, data: { status: "stored" } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
