import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";
import {
  type LenderProductRecord,
  type RequiredDocument,
} from "../db/schema/lenderProducts";

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

export async function listLenderProducts(params?: {
  activeOnly?: boolean;
  client?: Queryable;
}): Promise<LenderProductRecord[]> {
  const runner = params?.client ?? pool;
  const activeOnly = params?.activeOnly === true;
  const res = await runner.query<LenderProductRecord>(
    `select id, lender_id, name, description, active, required_documents, created_at, updated_at
     from lender_products
     where ($1::boolean is false or active = true)
     order by created_at desc`,
    [activeOnly]
  );
  return res.rows;
}

export async function updateLenderProductRequiredDocuments(params: {
  id: string;
  requiredDocuments: RequiredDocument[];
  client?: Queryable;
}): Promise<LenderProductRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `update lender_products
     set required_documents = $1,
         updated_at = now()
     where id = $2
     returning id, lender_id, name, description, active, required_documents, created_at, updated_at`,
    [params.requiredDocuments, params.id]
  );
  return res.rows[0] ?? null;
}
