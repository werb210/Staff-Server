import { randomUUID } from "crypto";
import { dbQuery } from "../../db";
import { upsertCrmLead } from "../crm/leadUpsert.service";

type CreateCreditReadinessLeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  collateralAvailable: string;
  score: number;
  tier: string;
  sessionToken: string;
  createdAt: Date;
};

type CreditReadinessLead = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  collateralAvailable: string;
  score: number;
  tier: string;
  sessionToken: string;
  createdAt: Date;
};

export async function createCreditReadinessLead(
  data: CreateCreditReadinessLeadInput
): Promise<{ id: string }> {
  const leadId = randomUUID();
  const normalizedEmail = data.email.trim().toLowerCase();

  const crmLead = await upsertCrmLead({
    companyName: data.companyName,
    fullName: data.contactName,
    email: normalizedEmail,
    phone: data.phone,
    industry: data.industry,
    yearsInBusiness: data.yearsInBusiness,
    monthlyRevenue: data.monthlyRevenue,
    annualRevenue: data.annualRevenue,
    arBalance: data.arBalance,
    collateralAvailable: data.collateralAvailable,
    source: "credit_readiness",
    tags: ["credit_readiness"],
    activityType: "credit_readiness_submission",
    activityPayload: {
      score: data.score,
      tier: data.tier,
      sessionToken: data.sessionToken,
    },
  });

  await dbQuery(
    `insert into readiness_leads (
      id,
      company_name,
      contact_name,
      full_name,
      phone,
      email,
      industry,
      years_in_business,
      annual_revenue,
      monthly_revenue,
      ar_balance,
      collateral_available,
      score,
      tier,
      session_token,
      source,
      status,
      crm_contact_id,
      created_at,
      updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'website', 'new', $16, $17, $17
    )`,
    [
      leadId,
      data.companyName,
      data.contactName,
      data.contactName,
      data.phone,
      normalizedEmail,
      data.industry,
      data.yearsInBusiness,
      data.annualRevenue,
      data.monthlyRevenue,
      data.arBalance,
      data.collateralAvailable,
      data.score,
      data.tier,
      data.sessionToken,
      crmLead.id,
      data.createdAt,
    ]
  );

  return { id: leadId };
}

export async function findCreditReadinessByToken(token: string): Promise<CreditReadinessLead | null> {
  const result = await dbQuery<{
    id: string;
    company_name: string;
    contact_name: string | null;
    full_name: string;
    email: string;
    phone: string;
    industry: string;
    years_in_business: string;
    annual_revenue: string;
    monthly_revenue: string;
    ar_balance: string;
    collateral_available: string;
    score: number;
    tier: string;
    session_token: string;
    created_at: Date;
  }>(
    `select id, company_name, contact_name, full_name, email, phone, industry, years_in_business,
            annual_revenue, monthly_revenue, ar_balance, collateral_available,
            score, tier, session_token, created_at
     from readiness_leads
     where session_token = $1
     limit 1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name ?? row.full_name,
    email: row.email,
    phone: row.phone,
    industry: row.industry,
    yearsInBusiness: row.years_in_business,
    annualRevenue: row.annual_revenue,
    monthlyRevenue: row.monthly_revenue,
    arBalance: row.ar_balance,
    collateralAvailable: row.collateral_available,
    score: row.score,
    tier: row.tier,
    sessionToken: row.session_token,
    createdAt: row.created_at,
  };
}
