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

const LENDERS_REPO = "src/repositories/lenders.repo.ts";
const LENDERS_TABLE = "lenders";

async function assertLenderColumnsExist(params: {
  route: string;
  columns: string[];
}): Promise<void> {
  try {
    const result = await pool.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1`,
      [LENDERS_TABLE]
    );
    const existing = new Set(result.rows.map((row) => row.column_name));
    const missing = params.columns.filter((column) => !existing.has(column));
    if (missing.length === 0) {
      return;
    }
    for (const column of missing) {
      logError("schema_column_missing", {
        route: params.route,
        repository: LENDERS_REPO,
        column,
        table: LENDERS_TABLE,
      });
    }
    throw new AppError(
      "db_schema_error",
      `Missing columns on ${LENDERS_TABLE}: ${missing.join(", ")}`,
      500
    );
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    logError("schema_column_check_failed", {
      route: params.route,
      repository: LENDERS_REPO,
      table: LENDERS_TABLE,
      stack: err instanceof Error ? err.stack : undefined,
    });
    const error = err instanceof Error ? err : new Error("Unknown schema error.");
    const appError = new AppError("db_error", error.message, 500);
    appError.stack = error.stack;
    throw appError;
  }
}

export const LIST_LENDERS_SQL = `
  SELECT
    id,
    name,
    NULL as country,
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
    await assertLenderColumnsExist({
      route: "/api/lenders",
      columns: [
        "id",
        "name",
        "submission_method",
        "phone",
        "website",
        "postal_code",
        "created_at",
      ],
    });
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
  await assertLenderColumnsExist({
    route: "/api/lenders/:id",
    columns: [
      "id",
      "name",
      "submission_method",
      "phone",
      "website",
      "postal_code",
      "created_at",
    ],
  });
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      NULL as country,
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
  await assertLenderColumnsExist({
    route: "/api/lenders",
    columns: [
      "id",
      "name",
      "submission_method",
      "email",
      "phone",
      "website",
      "postal_code",
    ],
  });
  const result = await pool.query(
    `
    INSERT INTO lenders (
      id,
      name,
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
      NULL as country,
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
      input.submission_method,
      input.email,
      input.phone,
      input.website,
      input.postal_code,
    ]
  );

  const rows = result.rows ?? [];
  const created = rows[0];
  if (!created) {
    throw new AppError("db_error", "Failed to create lender.", 500);
  }
  return created;
}
