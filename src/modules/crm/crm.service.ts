import { randomUUID } from "node:crypto";
import { dbQuery } from "../../db";

export interface CreateLeadInput {
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  industry?: string;
  yearsInBusiness?: string;
  monthlyRevenue?: string;
  annualRevenue?: string;
  requestedAmount?: string;
  creditScoreRange?: string;
  productInterest?: string;
  industryInterest?: string;
  arOutstanding?: string;
  existingDebt?: string;
  notes?: string;
  source: string;
  tags?: string[];
}

export interface CrmLeadRecord {
  id: string;
  companyName: string | null;
  fullName: string | null;
  phone: string | null;
  email: string;
  industry: string | null;
  yearsInBusiness: string | null;
  monthlyRevenue: string | null;
  annualRevenue: string | null;
  requestedAmount: string | null;
  creditScoreRange: string | null;
  productInterest: string | null;
  industryInterest: string | null;
  arOutstanding: string | null;
  existingDebt: string | null;
  notes: string | null;
  source: string;
  tags: string[];
  createdAt: string;
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function normalizedPhoneForLookup(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function createOrUpdateCrmLead(input: CreateLeadInput): Promise<{ id: string; created: boolean }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedPhone = normalizedPhoneForLookup(input.phone);
  const mergedInputTags = dedupeTags(input.tags ?? []);

  const existing = await dbQuery<{ id: string; tags: unknown }>(
    `select id, tags
     from crm_leads
     where lower(email) = $1
       and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2
     order by created_at asc
     limit 1`,
    [normalizedEmail, normalizedPhone]
  );

  if (existing.rows[0]) {
    const existingTags = Array.isArray(existing.rows[0].tags)
      ? (existing.rows[0].tags as string[])
      : [];
    const nextTags = dedupeTags([...existingTags, ...mergedInputTags]);

    await dbQuery(
      `update crm_leads
       set company_name = coalesce($2, company_name),
           full_name = coalesce($3, full_name),
           industry = coalesce($4, industry),
           years_in_business = coalesce($5, years_in_business),
           monthly_revenue = coalesce($6, monthly_revenue),
           annual_revenue = coalesce($7, annual_revenue),
           requested_amount = coalesce($8, requested_amount),
           credit_score_range = coalesce($9, credit_score_range),
           product_interest = coalesce($10, product_interest),
           industry_interest = coalesce($11, industry_interest),
           ar_outstanding = coalesce($12, ar_outstanding),
           existing_debt = coalesce($13, existing_debt),
           notes = coalesce($14, notes),
           source = coalesce($15, source),
           tags = $16::jsonb
       where id = $1`,
      [
        existing.rows[0].id,
        input.companyName || null,
        input.fullName || null,
        input.industry ?? null,
        input.yearsInBusiness ?? null,
        input.monthlyRevenue ?? null,
        input.annualRevenue ?? null,
        input.requestedAmount ?? null,
        input.creditScoreRange ?? null,
        input.productInterest ?? null,
        input.industryInterest ?? null,
        input.arOutstanding ?? null,
        input.existingDebt ?? null,
        input.notes ?? null,
        input.source,
        JSON.stringify(nextTags),
      ]
    );

    return { id: existing.rows[0].id, created: false };
  }

  const id = randomUUID();
  await dbQuery(
    `insert into crm_leads (
      id,
      company_name,
      full_name,
      phone,
      email,
      industry,
      years_in_business,
      monthly_revenue,
      annual_revenue,
      requested_amount,
      credit_score_range,
      product_interest,
      industry_interest,
      ar_outstanding,
      existing_debt,
      notes,
      source,
      tags
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
    )`,
    [
      id,
      input.companyName,
      input.fullName,
      input.phone,
      normalizedEmail,
      input.industry ?? null,
      input.yearsInBusiness ?? null,
      input.monthlyRevenue ?? null,
      input.annualRevenue ?? null,
      input.requestedAmount ?? null,
      input.creditScoreRange ?? null,
      input.productInterest ?? null,
      input.industryInterest ?? null,
      input.arOutstanding ?? null,
      input.existingDebt ?? null,
      input.notes ?? null,
      input.source,
      JSON.stringify(mergedInputTags),
    ]
  );

  return { id, created: true };
}

export async function createCrmLead(input: CreateLeadInput): Promise<{ id: string }> {
  const created = await createOrUpdateCrmLead(input);
  return { id: created.id };
}

export async function listCrmLeads(): Promise<CrmLeadRecord[]> {
  const result = await dbQuery<{
    id: string;
    company_name: string | null;
    full_name: string | null;
    phone: string | null;
    email: string;
    industry: string | null;
    years_in_business: string | null;
    monthly_revenue: string | null;
    annual_revenue: string | null;
    requested_amount: string | null;
    credit_score_range: string | null;
    product_interest: string | null;
    industry_interest: string | null;
    ar_outstanding: string | null;
    existing_debt: string | null;
    notes: string | null;
    source: string;
    tags: unknown;
    created_at: string;
  }>(
    `select
      id,
      company_name,
      full_name,
      phone,
      email,
      industry,
      years_in_business,
      monthly_revenue,
      annual_revenue,
      requested_amount,
      credit_score_range,
      product_interest,
      industry_interest,
      ar_outstanding,
      existing_debt,
      notes,
      source,
      tags,
      created_at
    from crm_leads
    order by created_at desc`
  );

  return result.rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    industry: row.industry,
    yearsInBusiness: row.years_in_business,
    monthlyRevenue: row.monthly_revenue,
    annualRevenue: row.annual_revenue,
    requestedAmount: row.requested_amount,
    creditScoreRange: row.credit_score_range,
    productInterest: row.product_interest,
    industryInterest: row.industry_interest,
    arOutstanding: row.ar_outstanding,
    existingDebt: row.existing_debt,
    notes: row.notes,
    source: row.source,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.created_at,
  }));
}
