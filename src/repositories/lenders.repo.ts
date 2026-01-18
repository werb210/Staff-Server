import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";
import { type LenderRecord, type LenderSubmissionMethod } from "../db/schema/lenders";

type Queryable = Pick<PoolClient, "query">;

export async function createLender(params: {
  name: string;
  country: string;
  active: boolean;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  street?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  submissionMethod?: LenderSubmissionMethod | null;
  submissionEmail?: string | null;
  client?: Queryable;
}): Promise<LenderRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderRecord>(
    `insert into lenders
     (id, name, active, phone, website, description, street, city, region, country, postal_code,
      contact_name, contact_email, contact_phone, submission_method, submission_email, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
     returning id, name, active, phone, website, description, street, city, region, country, postal_code,
       contact_name, contact_email, contact_phone, submission_method, submission_email, created_at`,
    [
      randomUUID(),
      params.name,
      params.active,
      params.phone ?? null,
      params.website ?? null,
      params.description ?? null,
      params.street ?? null,
      params.city ?? null,
      params.region ?? null,
      params.country,
      params.postalCode ?? null,
      params.contactName ?? null,
      params.contactEmail ?? null,
      params.contactPhone ?? null,
      params.submissionMethod ?? null,
      params.submissionEmail ?? null,
    ]
  );
  return res.rows[0];
}

export async function listLenders(client?: Queryable): Promise<LenderRecord[]> {
  const runner = client ?? pool;
  const res = await runner.query<LenderRecord>(
    `select id, name, active, phone, website, description, street, city, region, country, postal_code,
       contact_name, contact_email, contact_phone, submission_method, submission_email, created_at
     from lenders
     order by created_at desc`
  );
  return res.rows;
}

export async function getLenderById(
  lenderId: string,
  client?: Queryable
): Promise<LenderRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<LenderRecord>(
    `select id, name, active, phone, website, description, street, city, region, country, postal_code,
       contact_name, contact_email, contact_phone, submission_method, submission_email, created_at
     from lenders
     where id = $1
     limit 1`,
    [lenderId]
  );
  return res.rows[0] ?? null;
}
