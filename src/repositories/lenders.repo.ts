import { randomUUID } from "crypto";
import { pool } from "../db";
import { AppError } from "../middleware/errors";
import { logError } from "../observability/logger";

export interface CreateLenderInput {
  name: string;
  country: string;
  submission_method?: string | null;
  active?: boolean;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  postal_code?: string | null;
}

const LENDERS_REPO = "src/repositories/lenders.repo.ts";
const LENDERS_TABLE = "lenders";

type ColumnCheckResult = {
  existing: Set<string>;
  missing: string[];
};

async function getLenderColumns(): Promise<Set<string>> {
  const result = await pool.query<{ column_name: string }>(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1`,
    [LENDERS_TABLE]
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function assertLenderColumnsExist(params: {
  route: string;
  columns: string[];
  required?: string[];
}): Promise<ColumnCheckResult> {
  try {
    const existing = await getLenderColumns();
    const missing = params.columns.filter((column) => !existing.has(column));
    const required = params.required ?? [];
    const missingRequired = required.filter((column) => !existing.has(column));
    if (missing.length > 0) {
      for (const column of missing) {
        logError("schema_column_missing", {
          route: params.route,
          repository: LENDERS_REPO,
          column,
          table: LENDERS_TABLE,
        });
      }
    }
    if (missingRequired.length > 0) {
      throw new AppError(
        "db_schema_error",
        `Missing required columns on ${LENDERS_TABLE}: ${missingRequired.join(", ")}`,
        500
      );
    }
    return { existing, missing };
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

function buildSelectColumns(existing: Set<string>): string {
  const columns: Array<{ name: string; fallback?: string }> = [
    { name: "id" },
    { name: "name" },
    { name: "country" },
    { name: "submission_method", fallback: "null::text" },
    { name: "active", fallback: "true" },
    { name: "status", fallback: "'ACTIVE'::text" },
    { name: "email", fallback: "null::text" },
    { name: "phone", fallback: "null::text" },
    { name: "website", fallback: "null::text" },
    { name: "postal_code", fallback: "null::text" },
    { name: "created_at", fallback: "now()" },
  ];

  return columns
    .map((column) => {
      if (existing.has(column.name)) {
        return column.name;
      }
      const fallback = column.fallback ?? "null";
      return `${fallback} as ${column.name}`;
    })
    .join(", ");
}

export const LIST_LENDERS_SQL = `
  SELECT
    id,
    name,
    country,
    COALESCE(email, '') AS email,
    COALESCE(status, 'ACTIVE') AS status,
    phone,
    website,
    postal_code,
    created_at
  FROM lenders
  ORDER BY created_at DESC
`;

export async function listLenders(db: { query: typeof pool.query }) {
  const { rows } = await db.query(`
    SELECT
      id,
      name,
      country,
      COALESCE(email, '') AS email,
      COALESCE(status, 'ACTIVE') AS status,
      phone,
      website,
      postal_code,
      created_at
    FROM lenders
    ORDER BY created_at DESC
  `);
  return rows;
}

export async function getLenderById(id: string) {
  const check = await assertLenderColumnsExist({
    route: "/api/lenders/:id",
    columns: [
      "id",
      "name",
      "country",
      "submission_method",
      "status",
      "email",
      "phone",
      "website",
      "postal_code",
      "created_at",
    ],
    required: ["id", "name", "country"],
  });
  const selectColumns = buildSelectColumns(check.existing);
  const result = await pool.query(
    `
    SELECT
      ${selectColumns}
    FROM lenders
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  const rows = result.rows;
  return rows[0] ?? null;
}

export async function createLender(
  db: { query: typeof pool.query },
  input: CreateLenderInput
) {
  const { name, country, email = "", phone, website, postal_code } = input;
  const existingColumns = await getLenderColumns();
  const includeActive = existingColumns.has("active");

  try {
    const { rows } = await db.query(
      `
      INSERT INTO lenders (
        id,
        name,
        country,
        email,
        phone,
        website,
        postal_code,
        status${includeActive ? ",\n        active" : ""}
      )
      VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6,
        'ACTIVE'${includeActive ? ",\n        true" : ""}
      )
      RETURNING *
    `,
      [name, country, email, phone, website, postal_code]
    );
    return rows[0];
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = (err as { message?: string }).message ?? "";
    if (code === "42883" || message.includes("gen_random_uuid")) {
      const { rows } = await db.query(
        `
        INSERT INTO lenders (
          id,
          name,
          country,
          email,
          phone,
          website,
          postal_code,
          status${includeActive ? ",\n          active" : ""}
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          'ACTIVE'${includeActive ? ",\n          true" : ""}
        )
        RETURNING *
      `,
        [randomUUID(), name, country, email, phone, website, postal_code]
      );
      return rows[0];
    }
    throw err;
  }
}
