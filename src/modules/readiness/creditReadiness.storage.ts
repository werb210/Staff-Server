import { randomUUID } from "crypto";
import { dbQuery } from "../../db";
import { upsertCrmLead } from "../crm/leadUpsert.service";


let schemaEnsured = false;

async function safeQuery(sql: string): Promise<void> {
  try {
    await dbQuery(sql);
  } catch {
    // Best-effort compatibility for test runners and partially migrated environments.
  }
}

async function alterColumnToText(table: string, column: string): Promise<void> {
  await safeQuery(`alter table if exists ${table} alter column ${column} type text using ${column}::text`);
  await safeQuery(`alter table if exists ${table} alter column ${column} type text`);
}

async function ensureCapitalReadinessSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }

  await safeQuery(`alter table if exists readiness_leads add column if not exists ar_balance text`);
  await safeQuery(`alter table if exists readiness_leads add column if not exists collateral_available text`);
  await safeQuery(`alter table if exists readiness_leads add column if not exists score integer`);
  await safeQuery(`alter table if exists readiness_leads add column if not exists tier text`);
  await safeQuery(`alter table if exists readiness_leads add column if not exists session_token text`);

  await alterColumnToText("readiness_leads", "years_in_business");
  await alterColumnToText("readiness_leads", "annual_revenue");
  await alterColumnToText("readiness_leads", "monthly_revenue");
  await alterColumnToText("readiness_leads", "ar_balance");
  await alterColumnToText("readiness_leads", "collateral_available");

  await safeQuery(`create unique index if not exists readiness_leads_session_token_uidx on readiness_leads (session_token) where session_token is not null`);

  schemaEnsured = true;
}

type CreateCapitalReadinessLeadInput = {
  companyName: string;
  fullName: string;
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
  tag?: string;
};

type CapitalReadinessLead = {
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
  collateralAvailable: string;
  score: number | null;
  tier: string | null;
  sessionToken: string | null;
  createdAt: Date;
};

export async function createCapitalReadinessLead(
  data: CreateCapitalReadinessLeadInput
): Promise<{ id: string; sessionToken: string }> {
  await ensureCapitalReadinessSchema();

  const leadId = randomUUID();
  const sessionToken = randomUUID();
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
    collateralAvailable: data.collateralAvailable,
    source: "credit_readiness",
    tags: [data.tag ?? "credit_readiness"],
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
      score,
      tier,
      session_token,
      created_at,
      updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'website', 'new', $12, $13, $14, $15, now(), now()
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
      data.collateralAvailable,
      crmLead.id,
      data.score,
      data.tier,
      sessionToken,
    ]
  );

  return { id: leadId, sessionToken };
}

async function queryLead(whereClause: string, whereValue: string): Promise<CapitalReadinessLead | null> {
  await ensureCapitalReadinessSchema();

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
    score: number | null;
    tier: string | null;
    session_token: string | null;
    created_at: Date;
  }>(
    `select id, company_name, full_name, email, phone, industry, years_in_business,
            annual_revenue, monthly_revenue, ar_balance, collateral_available,
            score, tier, session_token, created_at
     from readiness_leads
     where ${whereClause} = $1
     limit 1`,
    [whereValue]
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
    collateralAvailable: row.collateral_available,
    score: row.score,
    tier: row.tier,
    sessionToken: row.session_token,
    createdAt: row.created_at,
  };
}

export async function findCapitalReadinessBySession(sessionToken: string): Promise<CapitalReadinessLead | null> {
  return queryLead("session_token", sessionToken);
}

export async function findCreditReadinessByToken(token: string): Promise<CapitalReadinessLead | null> {
  return findCapitalReadinessBySession(token);
}

export async function findCreditReadinessById(id: string): Promise<CapitalReadinessLead | null> {
  return queryLead("id", id);
}

export async function createCreditReadinessLead(data: {
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
}): Promise<{ id: string }> {
  const created = await createCapitalReadinessLead({
    ...data,
    collateralAvailable: data.availableCollateral,
    score: 0,
    tier: "unscored",
    tag: "credit_readiness",
  });
  return { id: created.id };
}
