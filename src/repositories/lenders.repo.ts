import { randomUUID } from "crypto";
import { pool } from "../db";
import { AppError } from "../middleware/errors";
import { logError } from "../observability/logger";

export interface CreateLenderInput {
  name: string;
  country: string;
  submission_method?: string | null;
  active?: boolean;
  status?: string | null;
  primary_contact_name?: string | null;
  email?: string | null;
  submission_email?: string | null;
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

function resolvePrimaryContactColumn(existing: Set<string>): string | null {
  if (existing.has("primary_contact_name")) {
    return "primary_contact_name";
  }
  if (existing.has("contact_name")) {
    return "contact_name";
  }
  return null;
}

function buildSelectColumns(existing: Set<string>): string {
  const primaryContactColumn = resolvePrimaryContactColumn(existing);
  const columns: Array<{ name: string; fallback?: string }> = [
    { name: "id" },
    { name: "name" },
    { name: "country" },
    { name: "submission_method", fallback: "null::text" },
    { name: "active", fallback: "true" },
    { name: "status", fallback: "'ACTIVE'::text" },
    { name: "primary_contact_name", fallback: "null::text" },
    { name: "email", fallback: "null::text" },
    { name: "phone", fallback: "null::text" },
    { name: "website", fallback: "null::text" },
    { name: "postal_code", fallback: "null::text" },
    { name: "submission_email", fallback: "null::text" },
    { name: "created_at", fallback: "now()" },
  ];

  return columns
    .map((column) => {
      if (column.name === "primary_contact_name") {
        if (primaryContactColumn) {
          return primaryContactColumn === "primary_contact_name"
            ? "primary_contact_name"
            : `${primaryContactColumn} as primary_contact_name`;
        }
        return `${column.fallback ?? "null"} as primary_contact_name`;
      }
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
    COALESCE(primary_contact_name, contact_name) AS primary_contact_name,
    submission_email,
    phone,
    website,
    postal_code,
    created_at
  FROM lenders
  ORDER BY created_at DESC
`;

export async function listLenders(db: { query: typeof pool.query }) {
  const existing = await getLenderColumns();
  const selectColumns = buildSelectColumns(existing);
  const { rows } = await db.query(`
    SELECT
      ${selectColumns}
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
  const {
    name,
    country,
    email = "",
    submission_email,
    primary_contact_name,
    phone,
    website,
    postal_code,
  } = input;
  const existingColumns = await getLenderColumns();
  const includeActive = existingColumns.has("active");
  const primaryContactColumn = resolvePrimaryContactColumn(existingColumns);
  const statusValue = input.status ?? "ACTIVE";
  const activeValue =
    typeof input.active === "boolean"
      ? input.active
      : statusValue === "ACTIVE";

  const columns: Array<{ name: string; value: unknown; raw?: boolean }> = [
    { name: "id", value: "gen_random_uuid()", raw: true },
    { name: "name", value: name },
    { name: "country", value: country },
    { name: "email", value: email },
    { name: "phone", value: phone ?? null },
    { name: "website", value: website ?? null },
    { name: "postal_code", value: postal_code ?? null },
    { name: "status", value: statusValue },
  ];

  if (primaryContactColumn) {
    columns.push({
      name: primaryContactColumn,
      value: primary_contact_name ?? null,
    });
  }
  if (existingColumns.has("submission_email")) {
    columns.push({
      name: "submission_email",
      value: submission_email ?? null,
    });
  }
  if (includeActive) {
    columns.push({ name: "active", value: activeValue });
  }

  const buildInsert = (entries: Array<{ name: string; value: unknown; raw?: boolean }>) => {
    const values: unknown[] = [];
    const placeholders = entries.map((entry) => {
      if (entry.raw) {
        return String(entry.value);
      }
      values.push(entry.value);
      return `$${values.length}`;
    });
    return { values, placeholders };
  };

  try {
    const columnNames = columns.map((entry) => entry.name);
    const { values, placeholders } = buildInsert(columns);
    const { rows } = await db.query(
      `
      INSERT INTO lenders (
        ${columnNames.join(",\n        ")}
      )
      VALUES (
        ${placeholders.join(",\n        ")}
      )
      RETURNING ${buildSelectColumns(existingColumns)}
    `,
      values
    );
    return rows[0];
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = (err as { message?: string }).message ?? "";
    if (code === "42883" || message.includes("gen_random_uuid")) {
      const adjustedColumns = columns.map((entry) =>
        entry.raw
          ? { name: entry.name, value: randomUUID() }
          : entry
      );
      const columnNames = adjustedColumns.map((entry) => entry.name);
      const { values, placeholders } = buildInsert(adjustedColumns);
      const { rows } = await db.query(
        `
        INSERT INTO lenders (
          ${columnNames.join(",\n          ")}
        )
        VALUES (
          ${placeholders.join(",\n          ")}
        )
        RETURNING ${buildSelectColumns(existingColumns)}
      `,
        values
      );
      return rows[0];
    }
    throw err;
  }
}

export async function updateLender(
  db: { query: typeof pool.query },
  params: {
    id: string;
    name?: string | null;
    status?: string | null;
    country?: string | null;
    primary_contact_name?: string | null;
    email?: string | null;
    submission_email?: string | null;
    active?: boolean;
  }
) {
  const existingColumns = await getLenderColumns();
  const primaryContactColumn = resolvePrimaryContactColumn(existingColumns);
  const updates: Array<{ name: string; value: unknown }> = [];

  if (params.name !== undefined && existingColumns.has("name")) {
    updates.push({ name: "name", value: params.name });
  }
  if (params.status !== undefined && existingColumns.has("status")) {
    updates.push({ name: "status", value: params.status });
  }
  if (params.country !== undefined && existingColumns.has("country")) {
    updates.push({ name: "country", value: params.country });
  }
  if (
    params.primary_contact_name !== undefined &&
    primaryContactColumn
  ) {
    updates.push({
      name: primaryContactColumn,
      value: params.primary_contact_name,
    });
  }
  if (params.email !== undefined && existingColumns.has("email")) {
    updates.push({ name: "email", value: params.email });
  }
  if (
    params.submission_email !== undefined &&
    existingColumns.has("submission_email")
  ) {
    updates.push({ name: "submission_email", value: params.submission_email });
  }
  if (params.active !== undefined && existingColumns.has("active")) {
    updates.push({ name: "active", value: params.active });
  }

  if (updates.length === 0) {
    return getLenderById(params.id);
  }

  const setClauses = updates.map(
    (entry, index) => `${entry.name} = $${index + 1}`
  );
  const values = updates.map((entry) => entry.value);
  values.push(params.id);

  const { rows } = await db.query(
    `
    UPDATE lenders
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length}
    RETURNING ${buildSelectColumns(existingColumns)}
    `,
    values
  );
  return rows[0] ?? null;
}
