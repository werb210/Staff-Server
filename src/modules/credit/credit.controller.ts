import { Request, Response } from "express";
import { createContinuation } from "../continuation/continuation.service";
import { upsertCrmLead } from "../crm/leadUpsert.service";
import { CreditReadinessSchema } from "./credit.schema";

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    companyName: payload.companyName,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    industry: payload.industry,
    yearsInBusiness: payload.yearsInBusiness,
    annualRevenue: payload.annualRevenue,
    monthlyRevenue: payload.monthlyRevenue,
    arBalance: payload.arBalance,
    collateral:
      payload.collateral
      ?? payload.collateralAvailable
      ?? payload.availableCollateral,
  };
}

export async function submitCreditReadiness(req: Request, res: Response) {
  const parse = CreditReadinessSchema.safeParse(
    normalizePayload(req.body as Record<string, unknown>)
  );

  if (!parse.success) {
    return res.status(400).json({
      error: "Invalid credit readiness payload",
      details: parse.error.flatten(),
    });
  }

  const data = parse.data;

  const lead = await upsertCrmLead({
    companyName: data.companyName,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    industry: data.industry,
    yearsInBusiness: data.yearsInBusiness,
    annualRevenue: data.annualRevenue,
    monthlyRevenue: data.monthlyRevenue,
    arBalance: data.arBalance,
    collateralAvailable: data.collateral,
    source: "website_credit_readiness",
    tags: ["credit_readiness", "pre_application"],
    activityType: "credit_readiness_submission",
    activityPayload: {
      status: "Pre-Application",
      normalizedCollateral: data.collateral,
    },
  });

  const continuationToken = await createContinuation(
    {
      companyName: data.companyName,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      industry: data.industry,
      yearsInBusiness: data.yearsInBusiness,
      annualRevenue: data.annualRevenue,
      monthlyRevenue: data.monthlyRevenue,
      arBalance: data.arBalance,
      collateralAvailable: data.collateral,
    },
    lead.id
  );

  const bridgeToken = Buffer.from(
    JSON.stringify({
      leadId: lead.id,
      continuationToken,
      companyName: data.companyName,
      industry: data.industry,
      yearsInBusiness: data.yearsInBusiness,
      annualRevenue: data.annualRevenue,
      monthlyRevenue: data.monthlyRevenue,
      arBalance: data.arBalance,
      collateral: data.collateral,
    })
  ).toString("base64");

  return res.json({
    success: true,
    leadId: lead.id,
    continuationToken,
    bridgeToken,
  });
}
