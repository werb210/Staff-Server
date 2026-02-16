import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { upsertCrmLead } from "../crm/leadUpsert.service";
import { sendSms } from "../notifications/sms.service";
import { createContinuation } from "../continuation/continuation.service";
import { logger } from "../../utils/logger";
import { z } from "zod";

const yearsInBusinessEnum = z.enum([
  "Zero",
  "Under 1 Year",
  "1 to 3 Years",
  "Over 3 Years",
]);

const annualRevenueEnum = z.enum([
  "Zero to $150,000",
  "$150,001 to $500,000",
  "$500,001 to $1,000,000",
  "$1,000,001 to $3,000,000",
  "Over $3,000,000",
]);

const monthlyRevenueEnum = z.enum([
  "Under $10,000",
  "$10,001 to $30,000",
  "$30,001 to $100,000",
  "Over $100,000",
]);

const arBalanceEnum = z.enum([
  "No Account Receivables",
  "Zero to $100,000",
  "$100,000 to $250,000",
  "$250,000 to $500,000",
  "$500,000 to $1,000,000",
  "$1,000,000 to $3,000,000",
  "Over $3,000,000",
]);

const availableCollateralEnum = z.enum([
  "No Collateral Available",
  "$1 to $100,000",
  "$100,001 to $250,000",
  "$250,001 to $500,000",
  "$500,001 to $1 million",
  "Over $1 million",
]);

const creditReadinessSchema = z.object({
  companyName: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email(),
  industry: z.string().trim().min(1),
  yearsInBusiness: yearsInBusinessEnum,
  annualRevenue: annualRevenueEnum,
  monthlyRevenue: monthlyRevenueEnum,
  arBalance: arBalanceEnum,
  availableCollateral: availableCollateralEnum,
  requestedAmount: z.string().trim().optional(),
  creditScoreRange: z.string().trim().optional(),
  productInterest: z.string().trim().optional(),
  industryInterest: z.string().trim().optional(),
});

type PrefillTokenPayload = {
  companyName: string;
  industry: string;
  yearsInBusiness: z.infer<typeof yearsInBusinessEnum>;
  annualRevenue: z.infer<typeof annualRevenueEnum>;
  monthlyRevenue: z.infer<typeof monthlyRevenueEnum>;
  arBalance: z.infer<typeof arBalanceEnum>;
  availableCollateral: z.infer<typeof availableCollateralEnum>;
  contactName: string;
  email: string;
  phone: string;
};

function getPrefillTokenSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function createPrefillToken(payload: PrefillTokenPayload): string {
  return jwt.sign(payload, getPrefillTokenSecret(), {
    algorithm: "HS256",
    expiresIn: "15m",
    audience: "boreal-client-application",
    issuer: "boreal-staff-server",
  });
}

export async function submitCreditReadiness(req: Request, res: Response) {
  try {
    const parsed = creditReadinessSchema.safeParse({
      ...(req.body as Record<string, unknown>),
      availableCollateral:
        (req.body as Record<string, unknown>).availableCollateral
        ?? (req.body as Record<string, unknown>).collateralAvailable,
    });

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid credit readiness payload",
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      });
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
      requestedAmount,
      creditScoreRange,
      productInterest,
      industryInterest,
      arBalance,
      availableCollateral,
    } = parsed.data;

    const lead = await upsertCrmLead({
      companyName,
      fullName,
      phone,
      email,
      industry,
      yearsInBusiness,
      monthlyRevenue,
      annualRevenue,
      arBalance,
      collateralAvailable: availableCollateral,
      source: "website_credit_readiness",
      tags: ["credit_readiness"],
      activityType: "credit_readiness_submission",
      activityPayload: {
        source: "website_credit_readiness",
        requestedAmount,
        creditScoreRange,
        productInterest,
        industryInterest,
        snapshot: {
          companyName,
          fullName,
          phone,
          email,
          industry,
          yearsInBusiness,
          monthlyRevenue,
          annualRevenue,
          arBalance,
          availableCollateral,
          requestedAmount: requestedAmount ?? null,
          creditScoreRange: creditScoreRange ?? null,
          productInterest: productInterest ?? null,
          industryInterest: industryInterest ?? null,
        },
      },
    });

    const prefillToken = createPrefillToken({
      companyName,
      industry,
      yearsInBusiness,
      annualRevenue,
      monthlyRevenue,
      arBalance,
      availableCollateral,
      contactName: fullName,
      email,
      phone,
    });

    const token = await createContinuation(
      {
        ...parsed.data,
        fullName,
        collateralAvailable: availableCollateral,
        prefillToken,
      },
      lead.id
    );

    await sendSms({
      to: "+15878881837",
      message: `New continuation lead: ${companyName}`,
    });

    logger.info("CREDIT_READINESS_SUBMITTED", {
      event: "CREDIT_READINESS_SUBMITTED",
      source: "website",
      leadId: lead.id,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      leadId: lead.id,
      prefillToken,
      redirect: `https://client.boreal.financial/apply?continue=${token}&prefill=${encodeURIComponent(prefillToken)}`,
    });
  } catch (err) {
    logger.error("credit_readiness_error", { err: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: "Server error" });
  }
}
