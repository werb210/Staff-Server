import { db } from "../db";

export interface CreateLenderInput {
  name: string;
  country: string;
  submission_method?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  postal_code?: string | null;
}

export async function listLenders() {
  const rows = await db.query(
    `
    SELECT
      id,
      name,
      country,
      submission_method,
      email,
      phone,
      website,
      postal_code,
      created_at
    FROM lenders
    ORDER BY created_at DESC
    `
  );
  return rows.rows;
}

export async function createLender(input: CreateLenderInput) {
  const result = await db.query(
    `
    INSERT INTO lenders (
      name,
      country,
      submission_method,
      email,
      phone,
      website,
      postal_code
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      name,
      country,
      submission_method,
      email,
      phone,
      website,
      postal_code,
      created_at
    `,
    [
      input.name,
      input.country,
      input.submission_method,
      input.email,
      input.phone,
      input.website,
      input.postal_code
    ]
  );

  return result.rows[0];
}
