import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { getClientSubmissionOwnerUserId } from "../config";
import { ApplicationStage } from "../modules/applications/pipelineState";
import { sendSms } from "../modules/notifications/sms.service";
import { createContinuation } from "../models/continuation";

const router = Router();

const payloadSchema = z.object({
  companyName: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  industry: z.string().optional(),
  yearsInBusiness: z.union([z.string(), z.number()]).optional(),
  monthlyRevenue: z.union([z.string(), z.number()]).optional(),
  annualRevenue: z.union([z.string(), z.number()]).optional(),
  arOutstanding: z.union([z.string(), z.number()]).optional(),
  existingDebt: z.union([z.string(), z.boolean()]).optional(),
});

router.post("/", async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const {
    companyName,
    fullName,
    phone,
    email,
    industry,
    yearsInBusiness,
    monthlyRevenue,
    annualRevenue,
    arOutstanding,
    existingDebt,
  } = parsed.data;

  const applicationId = randomUUID();
  await db.query(
    `
      insert into applications
      (id, owner_user_id, name, metadata, product_type, pipeline_state, status, source, created_at, updated_at)
      values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, now(), now())
    `,
    [
      applicationId,
      getClientSubmissionOwnerUserId(),
      companyName,
      JSON.stringify({
        contactName: fullName,
        phone,
        email,
        industry: industry ?? null,
        yearsInBusiness: yearsInBusiness ?? null,
        monthlyRevenue: monthlyRevenue ?? null,
        annualRevenue: annualRevenue ?? null,
        arOutstanding: arOutstanding ?? null,
        existingDebt: existingDebt ?? null,
      }),
      "standard",
      ApplicationStage.RECEIVED,
      ApplicationStage.RECEIVED,
      "website_credit_readiness",
    ]
  );

  await db.query(
    `
      insert into crm_leads (
        id, company_name, full_name, phone, email, industry,
        years_in_business, monthly_revenue, annual_revenue,
        ar_outstanding, existing_debt, source, tags, application_id, tag
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13::jsonb, $14, $15
      )
    `,
    [
      randomUUID(),
      companyName,
      fullName,
      phone,
      email,
      industry ?? null,
      yearsInBusiness ? String(yearsInBusiness) : null,
      monthlyRevenue ? String(monthlyRevenue) : null,
      annualRevenue ? String(annualRevenue) : null,
      arOutstanding ? String(arOutstanding) : null,
      existingDebt !== undefined ? String(existingDebt) : null,
      "website_credit_readiness",
      JSON.stringify(["credit_readiness"]),
      applicationId,
      "credit_readiness",
    ]
  );

  const continuationToken = await createContinuation(applicationId);

  await sendSms({
    to: "+15878881837",
    message: `New Credit Readiness Lead: ${companyName} - ${fullName}`,
  });

  res.json({ success: true, continuationToken });
});

export default router;
