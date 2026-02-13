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
  arOutstanding?: string;
  existingDebt?: string;
  notes?: string;
  source: string;
  tags?: string[];
}

export async function createCrmLead(input: CreateLeadInput): Promise<{ id: string }> {
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
      ar_outstanding,
      existing_debt,
      notes,
      source,
      tags
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
    )`,
    [
      id,
      input.companyName,
      input.fullName,
      input.phone,
      input.email,
      input.industry ?? null,
      input.yearsInBusiness ?? null,
      input.monthlyRevenue ?? null,
      input.annualRevenue ?? null,
      input.arOutstanding ?? null,
      input.existingDebt ?? null,
      input.notes ?? null,
      input.source,
      JSON.stringify(input.tags ?? []),
    ]
  );

  return { id };
}
