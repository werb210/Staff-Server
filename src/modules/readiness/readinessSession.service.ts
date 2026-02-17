import { randomUUID } from "node:crypto";
import { dbQuery, getInstrumentedClient, pool } from "../../db";
import { upsertCrmLead } from "../crm/leadUpsert.service";
import { normalizePhoneNumber } from "../auth/phone";

type ReadinessSessionInput = {
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  industry?: string;
  yearsInBusiness?: string;
  monthlyRevenue?: string;
  annualRevenue?: string;
  arBalance?: string;
  collateralAvailable?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRequiredPhone(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("invalid_phone");
  }
  return normalized;
}

function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function calculateReadinessScore(payload: ReadinessSessionInput): number {
  let score = 50;
  if (payload.yearsInBusiness === "Over 3 Years") score += 15;
  else if (payload.yearsInBusiness === "1 to 3 Years") score += 10;
  else if (payload.yearsInBusiness === "Under 1 Year") score += 5;

  if (payload.monthlyRevenue === "Over $100,000") score += 20;
  else if (payload.monthlyRevenue === "$30,001 to $100,000") score += 12;
  else if (payload.monthlyRevenue === "$10,001 to $30,000") score += 6;

  if (payload.annualRevenue === "Over $3,000,000" || payload.annualRevenue === "$1,000,001 to $3,000,000") {
    score += 8;
  } else if (payload.annualRevenue === "$500,001 to $1,000,000") {
    score += 4;
  }

  if (payload.arBalance && payload.arBalance !== "No Account Receivables") score += 5;
  if (payload.collateralAvailable === "No Collateral Available") score -= 5;

  return Math.max(0, Math.min(100, score));
}

export async function createOrReuseReadinessSession(payload: ReadinessSessionInput): Promise<{ sessionId: string; token: string; reused: boolean; crmLeadId: string; score: number }> {
  const email = normalizeEmail(payload.email);
  const normalizedPhone = normalizeRequiredPhone(payload.phone);

  await dbQuery(
    `update readiness_sessions
     set is_active = false, updated_at = now()
     where is_active = true and expires_at <= now()`
  );

  const startupInterest = String(payload.industry ?? "").toLowerCase().includes("startup");
  const score = calculateReadinessScore(payload);

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
      phone: normalizedPhone,
      industry: payload.industry,
      yearsInBusiness: payload.yearsInBusiness,
      monthlyRevenue: payload.monthlyRevenue,
      annualRevenue: payload.annualRevenue,
      arBalance: payload.arBalance,
      collateralAvailable: payload.collateralAvailable,
      source: "credit_readiness",
      tags: startupInterest ? ["readiness", "readiness_session", "startup_interest"] : ["readiness", "readiness_session"],
      activityType: "readiness_submission",
      activityPayload: { email, sessionId: existing.rows[0]?.id ?? null, score },
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
             ar_balance = $11,
             collateral_available = $12,
             status = 'open',
             updated_at = now()
         where id = $1`,
        [
          existing.rows[0].id,
          crmLead.id,
          email,
          normalizedPhone,
          payload.companyName,
          payload.fullName,
          payload.industry ?? null,
          toNullableText(payload.yearsInBusiness),
          toNullableText(payload.monthlyRevenue),
          toNullableText(payload.annualRevenue),
          toNullableText(payload.arBalance),
          toNullableText(payload.collateralAvailable),
        ]
      );

      await client.query("commit");
      return {
        sessionId: existing.rows[0].id,
        token: existing.rows[0].token,
        reused: true,
        crmLeadId: existing.rows[0].crm_lead_id ?? crmLead.id,
        score,
      };
    }

    const id = randomUUID();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await client.query(
      `insert into readiness_sessions (
        id, token, email, phone, company_name, full_name, industry,
        years_in_business, monthly_revenue, annual_revenue, ar_balance, collateral_available,
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
        normalizedPhone,
        payload.companyName,
        payload.fullName,
        payload.industry ?? null,
        toNullableText(payload.yearsInBusiness),
        toNullableText(payload.monthlyRevenue),
        toNullableText(payload.annualRevenue),
        toNullableText(payload.arBalance),
        toNullableText(payload.collateralAvailable),
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
    return { sessionId: id, token, reused: false, crmLeadId: crmLead.id, score };
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
  yearsInBusiness: string | null;
  monthlyRevenue: string | null;
  annualRevenue: string | null;
  arBalance: string | null;
  collateralAvailable: string | null;
  expiresAt: Date;
  createdAt: Date;
  score: number;
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
    years_in_business: string | null;
    monthly_revenue: string | null;
    annual_revenue: string | null;
    ar_balance: string | null;
    collateral_available: string | null;
    expires_at: Date;
    created_at: Date;
  }>(
    `select id, token, crm_lead_id, email, phone, company_name, full_name, industry,
            years_in_business, monthly_revenue, annual_revenue, ar_balance, collateral_available,
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
    arBalance: row.ar_balance,
    collateralAvailable: row.collateral_available,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    score: calculateReadinessScore({
      companyName: row.company_name,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone ?? "",
      industry: row.industry ?? undefined,
      yearsInBusiness: row.years_in_business ?? undefined,
      monthlyRevenue: row.monthly_revenue ?? undefined,
      annualRevenue: row.annual_revenue ?? undefined,
      arBalance: row.ar_balance ?? undefined,
      collateralAvailable: row.collateral_available ?? undefined,
    }),
  };
}

export async function getReadinessSessionByIdAndToken(
  sessionId: string,
  token: string
): Promise<
  | { status: "ok"; session: NonNullable<Awaited<ReturnType<typeof getActiveReadinessSessionByToken>>> }
  | { status: "invalid_token" }
  | { status: "expired" }
  | { status: "not_found" }
> {
  const lookup = await dbQuery<{
    id: string;
    token: string;
    is_active: boolean;
    expires_at: Date;
  }>(
    `select id, token, is_active, expires_at
     from readiness_sessions
     where id = $1
     limit 1`,
    [sessionId]
  );

  const row = lookup.rows[0];
  if (!row) {
    return { status: "not_found" };
  }

  if (row.token !== token) {
    return { status: "invalid_token" };
  }

  if (!row.is_active || row.expires_at <= new Date()) {
    return { status: "expired" };
  }

  const session = await getActiveReadinessSessionByToken(sessionId);
  if (!session) {
    return { status: "expired" };
  }

  return { status: "ok", session };
}
