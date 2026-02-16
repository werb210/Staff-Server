import { Router } from "express";
import { z } from "zod";
import { sendSms } from "../modules/notifications/sms.service";
import { createOrReuseReadinessSession } from "../modules/readiness/readinessSession.service";
import { upsertCrmLead } from "../modules/crm/leadUpsert.service";
import { retry } from "../utils/retry";
import { logError } from "../observability/logger";
import { tryBeginSmsDispatch } from "../modules/notifications/smsDispatch.service";

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

  const crmLead = await upsertCrmLead({
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
    source: "website_credit_readiness",
    tags: ["credit_readiness"],
    activityType: "credit_readiness_submission",
    activityPayload: { stage: "credit_readiness" },
  });

  const readinessSession = await createOrReuseReadinessSession({
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
  });

  const shouldSendSms = await tryBeginSmsDispatch(`credit_readiness:${email.toLowerCase()}:${phone}`);
  if (shouldSendSms) {
    await retry(
      () =>
        sendSms({
          to: "+15878881837",
          message: `Credit Readiness: ${fullName} | ${phone} | ${industry ?? "N/A"} | Monthly ${monthlyRevenue ?? "N/A"} / Annual ${annualRevenue ?? "N/A"}`,
        }),
      2
    ).catch((error) => {
      logError("credit_readiness_sms_failed", {
        message: error instanceof Error ? error.message : String(error),
        email,
      });
    });
  }

  res.json({
    success: true,
    sessionId: readinessSession.sessionId,
    token: readinessSession.token,
    crmLeadId: crmLead.id,
  });
});

export default router;
