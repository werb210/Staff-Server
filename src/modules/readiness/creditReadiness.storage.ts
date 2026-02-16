import { randomUUID } from "crypto";
import { dbQuery } from "../../db";
import { upsertCrmLead } from "../crm/leadUpsert.service";

type CreateCreditReadinessLeadInput = {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  availableCollateral: string;
};

type CreditReadinessLead = {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  availableCollateral: string;
  createdAt: Date;
};

export async function createCreditReadinessLead(
  data: CreateCreditReadinessLeadInput
): Promise<{ id: string }> {
  const leadId = randomUUID();
  const normalizedEmail = data.email.trim().toLowerCase();

  const crmLead = await upsertCrmLead({
    companyName: data.companyName,
    fullName: data.fullName,
    email: normalizedEmail,
    phone: data.phone,
    industry: data.industry,
    yearsInBusiness: data.yearsInBusiness,
    monthlyRevenue: data.monthlyRevenue,
    annualRevenue: data.annualRevenue,
    arBalance: data.arBalance,
    collateralAvailable: data.availableCollateral,
    source: "credit_readiness",
    tags: ["credit_readiness"],
    activityType: "credit_readiness_submission",
  });

  await dbQuery(
    `insert into readiness_leads (
      id,
      company_name,
      full_name,
      phone,
      email,
      industry,
      years_in_business,
      annual_revenue,
      monthly_revenue,
      ar_balance,
      collateral_available,
      source,
      status,
      crm_contact_id,
      created_at,
      updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'website', 'new', $12, now(), now()
    )`,
    [
      leadId,
      data.companyName,
      data.fullName,
      data.phone,
      normalizedEmail,
      data.industry,
      data.yearsInBusiness,
      data.annualRevenue,
      data.monthlyRevenue,
      data.arBalance,
      data.availableCollateral,
      crmLead.id,
    ]
  );

  return { id: leadId };
}

async function queryLead(id: string): Promise<CreditReadinessLead | null> {
  const result = await dbQuery<{
    id: string;
    company_name: string;
    full_name: string;
    email: string;
    phone: string;
    industry: string;
    years_in_business: string;
    annual_revenue: string;
    monthly_revenue: string;
    ar_balance: string;
    collateral_available: string;
    created_at: Date;
  }>(
    `select id, company_name, full_name, email, phone, industry, years_in_business,
            annual_revenue, monthly_revenue, ar_balance, collateral_available, created_at
     from readiness_leads
     where id = $1
     limit 1`,
    [id]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyName: row.company_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    industry: row.industry,
    yearsInBusiness: row.years_in_business,
    annualRevenue: row.annual_revenue,
    monthlyRevenue: row.monthly_revenue,
    arBalance: row.ar_balance,
    availableCollateral: row.collateral_available,
    createdAt: row.created_at,
  };
}

export async function findCreditReadinessByToken(token: string): Promise<CreditReadinessLead | null> {
  return queryLead(token);
}

export async function findCreditReadinessById(id: string): Promise<CreditReadinessLead | null> {
  return queryLead(id);
}
