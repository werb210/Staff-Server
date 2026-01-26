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
    { name: "name", fallback: "'Unnamed Product'::text" },
    { name: "description", fallback: "null::text" },
    { name: "active", fallback: "true" },
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
      "required_documents",
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
        "name",
        "description",
        "active",
        "required_documents",
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
      "name",
      "description",
      "active",
      "required_documents",
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
      "name",
      "description",
      "active",
      "required_documents",
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
  client?: Queryable;
}): Promise<LenderProductRecord | null> {
  const runner = params.client ?? pool;
  const existing = await assertLenderProductColumnsExist({
    route: "/api/lender-products/:id",
    columns: [
      "id",
      "lender_id",
      "name",
      "description",
      "active",
      "required_documents",
      "created_at",
      "updated_at",
    ],
    client: runner,
  });
  const updates = [
    { name: "name", value: params.name },
    {
      name: "required_documents",
      value: JSON.stringify(params.requiredDocuments),
      cast: "::jsonb",
    },
  ];
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
