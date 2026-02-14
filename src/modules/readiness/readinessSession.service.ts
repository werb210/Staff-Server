import { randomUUID } from "node:crypto";
import { dbQuery, getInstrumentedClient, pool } from "../../db";
import { upsertCrmLead } from "../crm/leadUpsert.service";

type ReadinessSessionInput = {
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  industry?: string;
  yearsInBusiness?: number | string;
  monthlyRevenue?: number | string;
  annualRevenue?: number | string;
  arOutstanding?: number | string;
  existingDebt?: boolean | string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toInteger(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNumeric(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(n) ? n : null;
}

function toBoolean(value: boolean | string | undefined): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

export async function createOrReuseReadinessSession(payload: ReadinessSessionInput): Promise<{ sessionId: string; token: string; reused: boolean; crmLeadId: string }> {
  const email = normalizeEmail(payload.email);
  const normalizedPhone = payload.phone.trim();

  await dbQuery(
    `update readiness_sessions
     set is_active = false, updated_at = now()
     where is_active = true and expires_at <= now()`
  );

  const startupInterest = String(payload.industry ?? "").toLowerCase().includes("startup");

  const client = await getInstrumentedClient();
  try {
    await client.query("begin");
    const existing = await client.query<{ id: string; token: string; crm_lead_id: string | null }>(
      `select id, token, crm_lead_id
       from readiness_sessions
       where (
          lower(email) = $1
          or (
            $2::text is not null
            and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
          )
       )
       and is_active = true and expires_at > now()
       order by created_at desc
       limit 1
       for update`,
      [email, normalizedPhone]
    );

    const crmLead = await upsertCrmLead({
      companyName: payload.companyName,
      fullName: payload.fullName,
      email,
      phone: payload.phone,
      industry: payload.industry,
      yearsInBusiness: payload.yearsInBusiness,
      monthlyRevenue: payload.monthlyRevenue,
      annualRevenue: payload.annualRevenue,
      arOutstanding: payload.arOutstanding,
      existingDebt: payload.existingDebt,
      source: "credit_readiness",
      tags: startupInterest ? ["readiness", "readiness_session", "startup_interest"] : ["readiness", "readiness_session"],
      activityType: "readiness_submission",
      activityPayload: { email, sessionId: existing.rows[0]?.id ?? null },
    });

    if (existing.rows[0]) {
      await client.query(
        `update readiness_sessions
         set crm_lead_id = coalesce(crm_lead_id, $2),
             email = $3,
             phone = $4,
             company_name = $5,
             full_name = $6,
             industry = $7,
             years_in_business = $8,
             monthly_revenue = $9,
             annual_revenue = $10,
             ar_outstanding = $11,
             existing_debt = $12,
             status = 'open',
             updated_at = now()
         where id = $1`,
        [
          existing.rows[0].id,
          crmLead.id,
          email,
          payload.phone,
          payload.companyName,
          payload.fullName,
          payload.industry ?? null,
          toInteger(payload.yearsInBusiness),
          toNumeric(payload.monthlyRevenue),
          toNumeric(payload.annualRevenue),
          toNumeric(payload.arOutstanding),
          toBoolean(payload.existingDebt),
        ]
      );

      await client.query("commit");
      return {
        sessionId: existing.rows[0].id,
        token: existing.rows[0].token,
        reused: true,
        crmLeadId: existing.rows[0].crm_lead_id ?? crmLead.id,
      };
    }

    const id = randomUUID();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await client.query(
      `insert into readiness_sessions (
        id, token, email, phone, company_name, full_name, industry,
        years_in_business, monthly_revenue, annual_revenue, ar_outstanding, existing_debt,
        crm_lead_id, expires_at, status
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, 'open'
      )`,
      [
        id,
        token,
        email,
        payload.phone,
        payload.companyName,
        payload.fullName,
        payload.industry ?? null,
        toInteger(payload.yearsInBusiness),
        toNumeric(payload.monthlyRevenue),
        toNumeric(payload.annualRevenue),
        toNumeric(payload.arOutstanding),
        toBoolean(payload.existingDebt),
        crmLead.id,
        expiresAt,
      ]
    );

    await client.query("commit");
    await pool.query(
      `insert into crm_lead_activities (id, lead_id, activity_type, payload)
       values ($1, $2, 'readiness_session_started', $3::jsonb)`,
      [randomUUID(), crmLead.id, JSON.stringify({ sessionId: id })]
    );
    return { sessionId: id, token, reused: false, crmLeadId: crmLead.id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getActiveReadinessSessionByToken(sessionId: string): Promise<null | {
  sessionId: string;
  readinessToken: string;
  leadId: string | null;
  email: string;
  phone: string | null;
  companyName: string;
  fullName: string;
  industry: string | null;
  yearsInBusiness: number | null;
  monthlyRevenue: string | null;
  annualRevenue: string | null;
  arOutstanding: string | null;
  existingDebt: boolean | null;
  expiresAt: Date;
  createdAt: Date;
}> {
  const result = await dbQuery<{
    id: string;
    token: string;
    crm_lead_id: string | null;
    email: string;
    phone: string | null;
    company_name: string;
    full_name: string;
    industry: string | null;
    years_in_business: number | null;
    monthly_revenue: string | null;
    annual_revenue: string | null;
    ar_outstanding: string | null;
    existing_debt: boolean | null;
    expires_at: Date;
    created_at: Date;
  }>(
    `select id, token, crm_lead_id, email, phone, company_name, full_name, industry,
            years_in_business, monthly_revenue, annual_revenue, ar_outstanding, existing_debt,
            expires_at, created_at
     from readiness_sessions
     where id = $1 and is_active = true and expires_at > now()
     limit 1`,
    [sessionId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    sessionId: row.id,
    readinessToken: row.token,
    leadId: row.crm_lead_id,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    fullName: row.full_name,
    industry: row.industry,
    yearsInBusiness: row.years_in_business,
    monthlyRevenue: row.monthly_revenue,
    annualRevenue: row.annual_revenue,
    arOutstanding: row.ar_outstanding,
    existingDebt: row.existing_debt,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
