import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";

export interface CompanyRow {
  id: string;
  name: string;
  dba_name: string | null;
  legal_name: string | null;
  business_structure: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  start_date: string | null;
  employee_count: number | null;
  estimated_annual_revenue: number | null;
  silo: string;
  owner_id: string | null;
  status: string;
}

export interface CreateCompanyInput {
  name: string;
  dba_name?: string | null;
  legal_name?: string | null;
  business_structure?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  address_country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  start_date?: string | null;
  employee_count?: number | null;
  estimated_annual_revenue?: number | null;
  silo: string;
  owner_id?: string | null;
}

export async function createCompany(client: Pool | PoolClient, input: CreateCompanyInput): Promise<CompanyRow> {
  const id = crypto.randomUUID();
  const { rows } = await client.query<CompanyRow>(
    `INSERT INTO companies
     (id, name, dba_name, legal_name, business_structure, address_street, address_city, address_state,
      address_zip, address_country, phone, email, website, start_date, employee_count,
      estimated_annual_revenue, silo, owner_id, status)
     VALUES
     ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      id,
      input.name,
      input.dba_name ?? null,
      input.legal_name ?? null,
      input.business_structure ?? null,
      input.address_street ?? null,
      input.address_city ?? null,
      input.address_state ?? null,
      input.address_zip ?? null,
      input.address_country ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.website ?? null,
      input.start_date ?? null,
      input.employee_count ?? null,
      input.estimated_annual_revenue ?? null,
      input.silo,
      input.owner_id ?? null,
      "prospect",
    ]
  );
  return rows[0] as CompanyRow;
}

export async function findOrCreateCompanyByNameAndSilo(
  client: Pool | PoolClient,
  name: string,
  silo: string,
  fullInput: CreateCompanyInput
): Promise<{ row: CompanyRow; created: boolean }> {
  const { rows: existingRows } = await client.query<CompanyRow>(
    `SELECT * FROM companies WHERE lower(name) = lower($1) AND silo = $2 LIMIT 1`,
    [name.trim(), silo]
  );
  if (existingRows[0]) {
    return { row: existingRows[0], created: false };
  }
  const row = await createCompany(client, fullInput);
  return { row, created: true };
}
