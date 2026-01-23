import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";
import {
  type LenderProductRecord,
  type RequiredDocument,
} from "../db/schema/lenderProducts";
import { AppError } from "../middleware/errors";
import { logError } from "../observability/logger";

type Queryable = Pick<PoolClient, "query">;

export async function createLenderProduct(params: {
  lenderId: string;
  name: string;
  description?: string | null;
  active: boolean;
  requiredDocuments: RequiredDocument[];
  client?: Queryable;
}): Promise<LenderProductRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `insert into lender_products
     (id, lender_id, name, description, active, required_documents, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, lender_id, name, description, active, required_documents, created_at, updated_at`,
    [
      randomUUID(),
      params.lenderId,
      params.name,
      params.description ?? null,
      params.active,
      params.requiredDocuments,
    ]
  );
  return res.rows[0];
}

export const LIST_LENDER_PRODUCTS_SQL = `select id,
        lender_id,
        coalesce(name, 'Unnamed Product') as name,
        description,
        active,
        required_documents,
        created_at,
        updated_at
 from lender_products
 where ($1::boolean is false or active = true)
 order by created_at desc`;

export async function listLenderProducts(params?: {
  activeOnly?: boolean;
  client?: Queryable;
}): Promise<LenderProductRecord[]> {
  const runner = params?.client ?? pool;
  const activeOnly = params?.activeOnly === true;
  try {
    const res = await runner.query<LenderProductRecord>(
      LIST_LENDER_PRODUCTS_SQL,
      [activeOnly]
    );
    return res.rows;
  } catch (err) {
    logError("lender_products_query_failed", {
      sql: LIST_LENDER_PRODUCTS_SQL,
      params: [activeOnly],
      stack: err instanceof Error ? err.stack : undefined,
    });
    const error = err instanceof Error ? err : new Error("Unknown database error.");
    const appError = new AppError("db_error", error.message, 500);
    appError.stack = error.stack;
    throw appError;
  }
}

export async function listLenderProductsByLenderId(params: {
  lenderId: string;
  client?: Queryable;
}): Promise<LenderProductRecord[]> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `select id,
            lender_id,
            coalesce(name, 'Unnamed Product') as name,
            description,
            active,
            required_documents,
            created_at,
            updated_at
     from lender_products
     where lender_id = $1
     order by created_at desc`,
    [params.lenderId]
  );
  return res.rows;
}

export async function updateLenderProduct(params: {
  id: string;
  name: string;
  requiredDocuments: RequiredDocument[];
  client?: Queryable;
}): Promise<LenderProductRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `update lender_products
     set name = $1,
         required_documents = $2,
         updated_at = now()
     where id = $3
     returning id, lender_id, name, description, active, required_documents, created_at, updated_at`,
    [params.name, params.requiredDocuments, params.id]
  );
  return res.rows[0] ?? null;
}
