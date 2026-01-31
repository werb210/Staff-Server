import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";
import {
  type JsonObject,
  type LenderProductRecord,
  type RequiredDocuments,
} from "../db/schema/lenderProducts";
import { AppError } from "../middleware/errors";
import { logError } from "../observability/logger";

type Queryable = Pick<PoolClient, "query">;

const LENDER_PRODUCTS_REPO = "src/repositories/lenderProducts.repo.ts";
const LENDER_PRODUCTS_TABLE = "lender_products";

async function assertLenderProductColumnsExist(params: {
  route: string;
  columns: string[];
  client: Queryable;
}): Promise<Set<string>> {
  try {
    const result = await params.client.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1`,
      [LENDER_PRODUCTS_TABLE]
    );
    const existing = new Set(result.rows.map((row) => row.column_name));
    const missing = params.columns.filter((column) => !existing.has(column));
    if (missing.length === 0) {
      return existing;
    }
    for (const column of missing) {
      logError("schema_column_missing", {
        route: params.route,
        repository: LENDER_PRODUCTS_REPO,
        column,
        table: LENDER_PRODUCTS_TABLE,
      });
    }
    throw new AppError(
      "db_schema_error",
      `Missing columns on ${LENDER_PRODUCTS_TABLE}: ${missing.join(", ")}`,
      500
    );
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    logError("schema_column_check_failed", {
      route: params.route,
      repository: LENDER_PRODUCTS_REPO,
      table: LENDER_PRODUCTS_TABLE,
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
    { name: "lender_id" },
    { name: "lender_name", fallback: "''::text" },
    { name: "name", fallback: "'Unnamed Product'::text" },
    { name: "description", fallback: "null::text" },
    { name: "active", fallback: "true" },
    { name: "type", fallback: "'loc'::text" },
    { name: "min_amount", fallback: "null::integer" },
    { name: "max_amount", fallback: "null::integer" },
    { name: "status", fallback: "'active'::text" },
    { name: "country", fallback: "'BOTH'::text" },
    { name: "rate_type", fallback: "null::text" },
    { name: "min_rate", fallback: "null::text" },
    { name: "max_rate", fallback: "null::text" },
    { name: "required_documents", fallback: "'[]'::jsonb" },
    { name: "eligibility", fallback: "null::jsonb" },
    { name: "created_at", fallback: "now()" },
    { name: "updated_at", fallback: "now()" },
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

export async function createLenderProduct(params: {
  lenderId: string;
  lenderName: string;
  name: string;
  description?: string | null;
  active: boolean;
  type: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  status: string;
  requiredDocuments: RequiredDocuments;
  eligibility?: JsonObject | null;
  country?: string | null;
  rateType?: string | null;
  minRate?: number | string | null;
  maxRate?: number | string | null;
  client?: Queryable;
}): Promise<LenderProductRecord> {
  const runner = params.client ?? pool;
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lender-products",
    columns: [
      "id",
      "lender_id",
      "lender_name",
      "name",
      "description",
      "type",
      "min_amount",
      "max_amount",
      "status",
      "active",
      "country",
      "rate_type",
      "min_rate",
      "max_rate",
      "required_documents",
      "eligibility",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
  const selectColumns = buildSelectColumns(existing);
  const columns = [
    { name: "id", value: randomUUID() },
    { name: "lender_id", value: params.lenderId },
    { name: "lender_name", value: params.lenderName },
    { name: "name", value: params.name },
    { name: "description", value: params.description ?? null },
    { name: "type", value: params.type },
    { name: "min_amount", value: params.minAmount ?? null },
    { name: "max_amount", value: params.maxAmount ?? null },
    { name: "status", value: params.status },
    { name: "active", value: params.active },
    { name: "required_documents", value: JSON.stringify(params.requiredDocuments) },
    { name: "eligibility", value: JSON.stringify(params.eligibility ?? null) },
    { name: "country", value: params.country ?? null },
    { name: "rate_type", value: params.rateType ?? null },
    { name: "min_rate", value: params.minRate ?? null },
    { name: "max_rate", value: params.maxRate ?? null },
  ].filter((entry) => existing.has(entry.name));

  const columnNames = columns.map((entry) => entry.name);
  const placeholders = columnNames.map((_, index) => `$${index + 1}`);
  const values = columns.map((entry) => entry.value);

  const res = await runner.query<LenderProductRecord>(
    `insert into lender_products
     (${columnNames.join(", ")}, created_at, updated_at)
     values (${placeholders.join(", ")}, now(), now())
     returning ${selectColumns}`,
    values
  );
  const rows = res.rows;
  const created = rows[0];
  if (!created) {
    throw new AppError("db_error", "Failed to create lender product.", 500);
  }
  return created;
}

export const LIST_LENDER_PRODUCTS_SQL = `select id,
        lender_id,
        coalesce(name, 'Unnamed Product') as name,
        description,
        active,
        required_documents,
        eligibility,
        created_at,
        updated_at
 from lender_products
 order by created_at desc`;

export async function listLenderProducts(
  client?: Queryable
): Promise<LenderProductRecord[]> {
  const runner = client ?? pool;
  try {
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lender-products",
    columns: [
      "id",
      "lender_id",
      "lender_name",
      "name",
      "description",
      "active",
      "type",
      "min_amount",
      "max_amount",
      "status",
      "country",
      "rate_type",
      "min_rate",
      "max_rate",
      "required_documents",
      "eligibility",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
    const selectColumns = buildSelectColumns(existing);
    const res = await runner.query<LenderProductRecord>(
      `select ${selectColumns}
       from lender_products
       order by created_at desc`
    );
    return res.rows;
  } catch (err) {
    logError("lender_products_query_failed", {
      sql: LIST_LENDER_PRODUCTS_SQL,
      params: [],
      stack: err instanceof Error ? err.stack : undefined,
    });
    const error = err instanceof Error ? err : new Error("Unknown database error.");
    const appError = new AppError("db_error", error.message, 500);
    appError.stack = error.stack;
    throw appError;
  }
}

export async function listLenderProductsByLenderId(
  lenderId: string,
  client?: Queryable
): Promise<LenderProductRecord[]> {
  const runner = client ?? pool;
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lenders/:id/products",
    columns: [
      "id",
      "lender_id",
      "lender_name",
      "name",
      "description",
      "active",
      "type",
      "min_amount",
      "max_amount",
      "status",
      "country",
      "rate_type",
      "min_rate",
      "max_rate",
      "required_documents",
      "eligibility",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
  const selectColumns = buildSelectColumns(existing);
  const res = await runner.query<LenderProductRecord>(
    `select ${selectColumns}
     from lender_products
     where lender_id = $1
     order by created_at desc`,
    [lenderId]
  );
  return res.rows;
}

export async function getLenderProductById(
  id: string,
  client?: Queryable
): Promise<LenderProductRecord | null> {
  const runner = client ?? pool;
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lender-products/:id",
    columns: [
      "id",
      "lender_id",
      "lender_name",
      "name",
      "description",
      "active",
      "type",
      "min_amount",
      "max_amount",
      "status",
      "country",
      "rate_type",
      "min_rate",
      "max_rate",
      "required_documents",
      "eligibility",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
  const selectColumns = buildSelectColumns(existing);
  const res = await runner.query<LenderProductRecord>(
    `select ${selectColumns}
     from lender_products
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function updateLenderProduct(params: {
  id: string;
  name: string;
  requiredDocuments: RequiredDocuments;
  eligibility?: JsonObject | null;
  description?: string | null;
  active?: boolean;
  type?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  status?: string | null;
  country?: string | null;
  rateType?: string | null;
  minRate?: number | string | null;
  maxRate?: number | string | null;
  client?: Queryable;
}): Promise<LenderProductRecord | null> {
  const runner = params.client ?? pool;
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lender-products/:id",
    columns: [
      "id",
      "lender_id",
      "lender_name",
      "name",
      "description",
      "active",
      "type",
      "min_amount",
      "max_amount",
      "status",
      "country",
      "rate_type",
      "min_rate",
      "max_rate",
      "required_documents",
      "eligibility",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
  const updates: Array<{ name: string; value: unknown; cast?: string }> = [
    { name: "name", value: params.name },
    {
      name: "required_documents",
      value: JSON.stringify(params.requiredDocuments),
      cast: "::jsonb",
    },
  ];
  if (existing.has("description") && params.description !== undefined) {
    updates.push({ name: "description", value: params.description ?? null });
  }
  if (existing.has("active") && params.active !== undefined) {
    updates.push({ name: "active", value: params.active });
  }
  if (existing.has("type") && params.type !== undefined) {
    updates.push({ name: "type", value: params.type });
  }
  if (existing.has("min_amount") && params.minAmount !== undefined) {
    updates.push({ name: "min_amount", value: params.minAmount ?? null });
  }
  if (existing.has("max_amount") && params.maxAmount !== undefined) {
    updates.push({ name: "max_amount", value: params.maxAmount ?? null });
  }
  if (existing.has("status") && params.status !== undefined) {
    updates.push({ name: "status", value: params.status });
  }
  if (existing.has("country") && params.country !== undefined) {
    updates.push({ name: "country", value: params.country });
  }
  if (existing.has("rate_type") && params.rateType !== undefined) {
    updates.push({ name: "rate_type", value: params.rateType });
  }
  if (existing.has("min_rate") && params.minRate !== undefined) {
    updates.push({ name: "min_rate", value: params.minRate });
  }
  if (existing.has("max_rate") && params.maxRate !== undefined) {
    updates.push({ name: "max_rate", value: params.maxRate });
  }
  if (existing.has("eligibility") && params.eligibility !== undefined) {
    updates.push({
      name: "eligibility",
      value: JSON.stringify(params.eligibility),
      cast: "::jsonb",
    });
  }

  const setClauses = updates.map(
    (entry, index) =>
      `${entry.name} = $${index + 1}${entry.cast ?? ""}`
  );
  const values = updates.map((entry) => entry.value);
  values.push(params.id);
  const selectColumns = buildSelectColumns(existing);

  const res = await runner.query<LenderProductRecord>(
    `update lender_products
     set ${setClauses.join(", ")},
         updated_at = now()
     where id = $${values.length}
     returning ${selectColumns}`,
    values
  );
  return res.rows[0] ?? null;
}
