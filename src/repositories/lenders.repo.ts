import { randomUUID } from "crypto";
import { pool } from "../db";
import { AppError } from "../middleware/errors";
import { logError } from "../observability/logger";

export interface CreateLenderInput {
  name: string;
  country: string;
  submission_method?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  postal_code?: string | null;
}

export const LIST_LENDERS_SQL = `
  SELECT
    id,
    name,
    country,
    submission_method,
    phone,
    website,
    postal_code,
    created_at
  FROM lenders
  ORDER BY created_at DESC
`;

export async function listLenders() {
  try {
    const result = await pool.query(LIST_LENDERS_SQL);
    return result.rows ?? [];
  } catch (err) {
    logError("lenders_query_failed", {
      sql: LIST_LENDERS_SQL,
      params: [],
      stack: err instanceof Error ? err.stack : undefined,
    });
    const error = err instanceof Error ? err : new Error("Unknown database error.");
    const appError = new AppError("db_error", error.message, 500);
    appError.stack = error.stack;
    throw appError;
  }
}

export async function getLenderById(id: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      country,
      submission_method,
      phone,
      website,
      postal_code,
      created_at
    FROM lenders
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  const rows = result.rows ?? [];
  return rows[0] ?? null;
}

export async function createLender(input: CreateLenderInput) {
  const result = await pool.query(
    `
    INSERT INTO lenders (
      id,
      name,
      country,
      submission_method,
      email,
      phone,
      website,
      postal_code
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      randomUUID(),
      input.name,
      input.country,
      input.submission_method,
      input.email,
      input.phone,
      input.website,
      input.postal_code
    ]
  );

  const rows = result.rows ?? [];
  const created = rows[0];
  if (!created) {
    throw new AppError("db_error", "Failed to create lender.", 500);
  }
  return created;
}
